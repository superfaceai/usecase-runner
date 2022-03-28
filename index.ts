import {
  HttpScheme,
  isApiKeySecurityValues,
  isBasicAuthSecurityValues,
  isBearerTokenSecurityValues,
  isDigestSecurityValues,
  MapDocumentNode,
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
import { parseMap, parseProfile, Source } from '@superfaceai/parser';
import { readFile } from 'fs/promises';
import { join } from 'path';

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

export type PerformOpts<TInput> = {
  profileAst: ProfileDocumentNode;
  mapAst: MapDocumentNode;
  provider: ProviderJson;
  usecase: string;
  input?: TInput;
  security?: SecurityValues[];
  parameters?: Record<string, string>;
};

async function perform({
  profileAst,
  mapAst,
  provider,
  usecase,
  input,
  security,
  parameters,
}: PerformOpts<any>) {
  const boundProvider = new BoundProfileProvider(
    profileAst,
    mapAst,
    provider.name,
    {
      services: new ServiceSelector(provider.services, provider.defaultService),
      security: resolveSecurityConfiguration(
        provider.securitySchemes ?? [],
        security ?? [],
        provider.name
      ),
    }
  );

  return await boundProvider.perform(usecase, input, parameters);
}

export type RunOpts = {
  usecase: string;
  profile: Source;
  map: Source;
  provider: ProviderJson;
  env?: string;
};

export async function run({ usecase, profile, map, provider, env }: RunOpts) {
  // Parse profile and map sources,
  const profileAst = await parseProfile(profile);
  const mapAst = await parseMap(map);

  // TODO: create security from env file
  const security = [];

  // TODO: gather integration prameters from env file
  const parameters = {};

  const input = { city: 'Prague, Czechia', units: 'C' };

  try {
    const result = await perform({
      profileAst,
      mapAst,
      provider,
      usecase: 'GetCurrentWeatherInCity',
      input,
    });

    console.log(result.unwrap());
  } catch (e) {
    console.error('ERR', e);
  }
}

async function main() {
  const usecase = {
    profile: new Source(
      await readFile(join(__dirname, 'usecases', 'current-city.supr'), {
        encoding: 'utf8',
      })
    ),
    map: new Source(
      await readFile(join(__dirname, 'usecases', 'wttr-in.suma'), {
        encoding: 'utf8',
      })
    ),
    provider: JSON.parse(
      await readFile(join(__dirname, 'usecases', 'wttr-in.json'), {
        encoding: 'utf8',
      })
    ),
    env: await readFile(join(__dirname, 'usecases', 'wttr-in.env'), {
      encoding: 'utf8',
    }),
  };

  await run({ ...usecase, usecase: 'GetCurrentWeatherInCity' });
}

main();
