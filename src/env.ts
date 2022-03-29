import { clone } from '@superfaceai/one-sdk/dist/lib/object';
import { DotenvParseOutput, parse as parseDotenv } from 'dotenv';

// TODO: can it be shared with original implementation in onesdk?
//   see https://github.com/superfaceai/one-sdk-js/blob/e6a8989a44ecc18c76960b1392d6f6e2b48df186/src/lib/env.ts#L13-L27
export function resolveEnv(config: DotenvParseOutput, str: string): string {
  let value = str;

  if (str.startsWith('$')) {
    const variable = str.slice(1);
    const env = config[variable];
    if (env !== undefined) {
      value = env;
    } else {
      console.warn(`Enviroment variable ${variable} not found`);
    }
  }

  return value;
}

// TODO: can it be shared with original implementation in onesdk?
//   see https://github.com/superfaceai/one-sdk-js/blob/e6a8989a44ecc18c76960b1392d6f6e2b48df186/src/lib/env.ts#L34-L56
export function resolveEnvRecord<T extends Record<string, unknown>>(
  config: DotenvParseOutput,
  record: T,
): T {
  // If typed as `Partial<T>` typescript complains with "Type 'string' cannot be used to index type 'Partial<T>'. ts(2536)"
  const result: Partial<Record<string, unknown>> = {};

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') {
      // replace strings
      result[key] = resolveEnv(config, value);
    } else if (typeof value === 'object' && value !== null) {
      // recurse objects
      result[key] = resolveEnvRecord(config, value as Record<string, unknown>);
    } else {
      if (value !== undefined) {
        // clone everything else
        result[key] = clone(value);
      }
    }
  }

  return result as T;
}

export function parseEnv(env: string): DotenvParseOutput {
  return parseDotenv(env);
}
