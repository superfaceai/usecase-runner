import {
  HttpScheme,
  isApiKeySecurityValues,
  isBasicAuthSecurityValues,
  isBearerTokenSecurityValues,
  isDigestSecurityValues,
  MapDocumentNode,
  prepareProviderParameters,
  prepareSecurityValues,
  ProfileDocumentNode,
  ProviderJson,
  SecurityScheme,
  SecurityType,
  SecurityValues,
} from '@superfaceai/ast';
import { BoundProfileProvider } from '@superfaceai/one-sdk';
import {
  invalidSecurityValuesError,
  securityNotFoundError,
} from '@superfaceai/one-sdk/dist/internal/errors.helpers';
import { SecurityConfiguration } from '@superfaceai/one-sdk/dist/internal/interpreter/http';
import { ServiceSelector } from '@superfaceai/one-sdk/dist/lib/services';
import { clone } from '@superfaceai/one-sdk/dist/lib/object';
import { parseMap, parseProfile, Source } from '@superfaceai/parser';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { DotenvParseOutput, parse as envParse } from 'dotenv';

// TODO: replace with exposed implementatoin, once refactored https://github.com/superfaceai/one-sdk-js/pull/225
export function resolveSecurityConfiguration(
  schemes: SecurityScheme[],
  values: SecurityValues[],
  providerName: string
): SecurityConfiguration[] {
  const result: SecurityConfiguration[] = [];

  for (const vals of values) {
    const scheme = schemes.find((scheme) => scheme.id === vals.id);
    if (scheme === undefined) {
      const definedSchemes = schemes.map((s) => s.id);
      throw securityNotFoundError(providerName, definedSchemes, vals);
    }

    const invalidSchemeValuesErrorBuilder = (
      scheme: SecurityScheme,
      values: SecurityValues,
      requiredKeys: [string, ...string[]]
    ) => {
      const valueKeys = Object.keys(values).filter((k) => k !== 'id');

      return invalidSecurityValuesError(
        providerName,
        scheme.type,
        scheme.id,
        valueKeys,
        requiredKeys
      );
    };

    if (scheme.type === SecurityType.APIKEY) {
      if (!isApiKeySecurityValues(vals)) {
        throw invalidSchemeValuesErrorBuilder(scheme, vals, ['apikey']);
      }

      result.push({
        ...scheme,
        ...vals,
      });
    } else {
      switch (scheme.scheme) {
        case HttpScheme.BASIC:
          if (!isBasicAuthSecurityValues(vals)) {
            throw invalidSchemeValuesErrorBuilder(scheme, vals, [
              'username',
              'password',
            ]);
          }

          result.push({
            ...scheme,
            ...vals,
          });
          break;

        case HttpScheme.BEARER:
          if (!isBearerTokenSecurityValues(vals)) {
            throw invalidSchemeValuesErrorBuilder(scheme, vals, ['token']);
          }

          result.push({
            ...scheme,
            ...vals,
          });
          break;

        case HttpScheme.DIGEST:
          if (!isDigestSecurityValues(vals)) {
            throw invalidSchemeValuesErrorBuilder(scheme, vals, ['digest']);
          }

          result.push({
            ...scheme,
            ...vals,
          });
          break;
      }
    }
  }

  return result;
}

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
  record: T
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

export type PerformOpts<TInput> = {
  profileAst: ProfileDocumentNode;
  mapAst: MapDocumentNode;
  providerJson: ProviderJson;
  usecase: string;
  input?: TInput;
  security?: SecurityValues[];
  parameters?: Record<string, string>;
};

async function perform({
  profileAst,
  mapAst,
  providerJson,
  usecase,
  input,
  security,
  parameters,
}: PerformOpts<any>) {
  const boundProvider = new BoundProfileProvider(
    profileAst,
    mapAst,
    providerJson.name,
    {
      services: new ServiceSelector(
        providerJson.services,
        providerJson.defaultService
      ),
      security: resolveSecurityConfiguration(
        providerJson.securitySchemes ?? [],
        security ?? [],
        providerJson.name
      ),
    }
  );

  return await boundProvider.perform(usecase, input, parameters);
}

export type RunOpts = {
  usecase: string;
  profile: string;
  map: string;
  provider: string;
  input?: any;
  env?: string;
};

export async function run({
  usecase,
  profile,
  provider,
  map,
  input,
  env,
}: RunOpts) {
  // Parse profile and map sources,
  const profileAst = await parseProfile(new Source(profile));
  const mapAst = await parseMap(new Source(map));
  const providerJson: ProviderJson = JSON.parse(provider);

  const security = prepareSecurityValues(
    providerJson.name,
    providerJson.securitySchemes ?? []
  );
  const parameters = prepareProviderParameters(
    providerJson.name,
    providerJson.parameters ?? []
  );

  console.log('security', security);
  console.log('parameters', parameters);

  const config = envParse(env ?? '');

  const resolvedSecurity =
    security.map((entry) => resolveEnvRecord(config, entry)) ?? [];
  const resolvedParameter = resolveEnvRecord(config, parameters);

  console.log('resolvedSecurity', resolvedSecurity);
  console.log('resolvedParameter', resolvedParameter);

  return await perform({
    profileAst,
    mapAst,
    providerJson,
    usecase,
    input,
    security: resolvedSecurity,
    parameters: resolvedParameter,
  });
}

async function loadUsecaseFromStation(profile: string, provider: string) {
  const gridPath = join(__dirname, '../..', 'station', 'grid');
  const providerPath = join(__dirname, '../..', 'station', 'providers');

  return {
    profile: await readFile(join(gridPath, profile, 'profile.supr'), {
      encoding: 'utf8',
    }),
    map: await readFile(join(gridPath, profile, 'maps', `${provider}.suma`), {
      encoding: 'utf8',
    }),
    provider: await readFile(join(providerPath, `${provider}.json`), {
      encoding: 'utf8',
    }),
    env: 'OPENWEATHERMAP_API_KEY=xxx', // TODO
  };
}

async function main() {
  const usecaseFiles = await loadUsecaseFromStation(
    'weather/current-city',
    'openweathermap'
  );

  try {
    const result = await run({
      ...usecaseFiles,
      usecase: 'GetCurrentWeatherInCity',
      input: { city: 'Prague, Czechia', units: 'C' },
    });

    console.log(result);
  } catch (e) {
    console.error('ERR', e);
  }
}

main();
