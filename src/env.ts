import { clone } from '@superfaceai/one-sdk/dist/lib/object';
import { DotenvParseOutput, parse as parseDotenv } from 'dotenv';
import { BaseError, MissingEnvVariableError } from './errors';
import createDebug from 'debug';
import { DEBUG_PREFIX } from './constants';

const debug = createDebug(`${DEBUG_PREFIX}:env`);

export function resolveEnv(config: DotenvParseOutput, str: string): string {
  let value = str;

  if (str.startsWith('$')) {
    const variable = str.slice(1);
    const env = config[variable];

    if (env === undefined) {
      throw new MissingEnvVariableError(variable);
    }

    value = env;
  }

  return value;
}

export function resolveEnvRecord<T extends Record<string, unknown>>(
  config: DotenvParseOutput,
  record: T,
  warnings: BaseError[] = [],
): T {
  // If typed as `Partial<T>` typescript complains with "Type 'string' cannot be used to index type 'Partial<T>'. ts(2536)"
  const result: Partial<Record<string, unknown>> = {};

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') {
      try {
        // replace strings
        result[key] = resolveEnv(config, value);
      } catch (err) {
        if (err instanceof MissingEnvVariableError) {
          warnings.push(err);
          debug(err.formatShort());
        } else {
          throw err;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      // recurse objects
      result[key] = resolveEnvRecord(
        config,
        value as Record<string, unknown>,
        warnings,
      );
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
