import {
  MapDocumentNode,
  prepareProviderParameters,
  prepareSecurityValues,
  ProfileDocumentNode,
  ProviderJson,
  SecurityValues,
} from '@superfaceai/ast';
import {
  BoundProfileProvider,
  MapInterpreterError,
  ProfileParameterError,
  Result,
} from '@superfaceai/one-sdk';
import { NonPrimitive } from '@superfaceai/one-sdk/dist/internal/interpreter/variables';
import { ServiceSelector } from '@superfaceai/one-sdk/dist/lib/services';
import { parseMap, parseProfile, Source } from '@superfaceai/parser';
import { parseEnv, resolveEnvRecord } from './env';
import { resolveSecurityConfiguration } from './security';
import createDebug from 'debug';
import { DEBUG_PREFIX } from './constants';

const debug = createDebug(`${DEBUG_PREFIX}:index`);

async function performUseCase<
  TInput extends NonPrimitive | undefined = undefined,
  TResult = any,
>({
  profileAst,
  mapAst,
  providerJson,
  usecase,
  input,
  security,
  parameters,
}: {
  profileAst: ProfileDocumentNode;
  mapAst: MapDocumentNode;
  providerJson: ProviderJson;
  usecase: string;
  input?: TInput;
  security?: SecurityValues[];
  parameters?: Record<string, string>;
}): Promise<Result<TResult, ProfileParameterError | MapInterpreterError>> {
  const boundProvider = new BoundProfileProvider(
    profileAst,
    mapAst,
    providerJson.name,
    {
      services: new ServiceSelector(
        providerJson.services,
        providerJson.defaultService,
      ),
      security: resolveSecurityConfiguration(
        providerJson.securitySchemes ?? [],
        security ?? [],
        providerJson.name,
      ),
    },
  );

  return await boundProvider.perform(usecase, input, parameters);
}

export type PerformOpts = {
  usecase: string;
  profile: string;
  map: string;
  provider: string;
  input?: any;
  env?: string;
};

export async function perform({
  usecase,
  profile,
  provider,
  map,
  input,
  env,
}: PerformOpts) {
  // Parse profile and map sources,
  const profileAst = await parseProfile(new Source(profile)); // TODO: Wrap to error to properly report
  const mapAst = await parseMap(new Source(map)); // TODO: Wrap to error to properly report
  const providerJson: ProviderJson = JSON.parse(provider); // TODO: Wrap to error to properly report and validate provider against schema

  const security = prepareSecurityValues(
    providerJson.name,
    providerJson.securitySchemes ?? [],
  );
  const parameters = prepareProviderParameters(
    providerJson.name,
    providerJson.parameters ?? [],
  );

  const config = parseEnv(env ?? '');
  const resolvedSecurity =
    security.map((entry) => resolveEnvRecord(config, entry)) ?? [];
  const resolvedParameter = resolveEnvRecord(config, parameters);

  debug('resolvedSecurity', resolvedSecurity);
  debug('resolvedParameter', resolvedParameter);

  return await performUseCase({
    profileAst,
    mapAst,
    providerJson,
    usecase,
    input,
    security: resolvedSecurity,
    parameters: resolvedParameter,
  });
}
