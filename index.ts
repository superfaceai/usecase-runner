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

async function loadUsecase() {
  return {
    profile: await readFile(join(__dirname, 'usecases', 'current-city.supr'), {
      encoding: 'utf8',
    }),
    map: await readFile(join(__dirname, 'usecases', 'wttr-in.suma'), {
      encoding: 'utf8',
    }),
    provider: await readFile(join(__dirname, 'usecases', 'wttr-in.json'), {
      encoding: 'utf8',
    }),
    env: await readFile(join(__dirname, 'usecases', 'wttr-in.env'), {
      encoding: 'utf8',
    }),
  };
}

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

async function main() {
  const usecase = await loadUsecase();

  const profileAst = await parseProfile(new Source(usecase.profile));
  const mapAst = await parseMap(new Source(usecase.map));
  const provider = JSON.parse(usecase.provider);

  // TODO: create security from env file
  const security = [];

  // TODO: gather integration prameters from env file
  const parameters = {};

  try {
    const result = await perform({
      profileAst,
      mapAst,
      provider,
      usecase: 'GetCurrentWeatherInCity',
      input: { city: 'Prague, Czechia', units: 'C' },
    });

    console.log(result.unwrap());
  } catch (e) {
    console.error('ERR', e);
  }
}

main();
