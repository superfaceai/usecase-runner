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
} from '@superfaceai/one-sdk';
import { NonPrimitive } from '@superfaceai/one-sdk/dist/internal/interpreter/variables';
import { ServiceSelector } from '@superfaceai/one-sdk/dist/lib/services';
import createDebug from 'debug';
import { DEBUG_PREFIX } from './constants';
import { parseEnv, resolveEnvRecord } from './env';
import { BaseError } from './errors';
import { parseMap, parseProfile, parseProvider } from './parse';
import { Result, err, result } from './result';
import { resolveSecurityConfiguration } from './security';

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

export type PerformOpts<TInput> = {
  usecase: string;
  profile: string;
  map: string;
  provider: string;
  input?: TInput;
  env?: string;
};

export async function perform<
  TInput extends NonPrimitive | undefined = undefined,
  TResult = any,
>({
  usecase,
  profile,
  provider,
  map,
  input,
  env,
}: PerformOpts<TInput>): Promise<
  Result<TResult, BaseError | ProfileParameterError | MapInterpreterError>
> {
  // Parse profile and map sources,
  let profileAst: ProfileDocumentNode;
  let mapAst: MapDocumentNode;
  let providerJson: ProviderJson;

  try {
    profileAst = await parseProfile(profile);
    mapAst = await parseMap(map);
    providerJson = await parseProvider(provider);
  } catch (e) {
    if (e instanceof BaseError) {
      return err<TResult, BaseError>(e);
    }

    throw e;
  }

  const security = prepareSecurityValues(
    providerJson.name,
    providerJson.securitySchemes ?? [],
  );
  const parameters = prepareProviderParameters(
    providerJson.name,
    providerJson.parameters ?? [],
  );

  const config = parseEnv(env ?? '');
  const warns: BaseError[] = [];

  const resolvedSecurity =
    security.map((entry) => resolveEnvRecord(config, entry, warns)) ?? [];
  const resolvedParameter = resolveEnvRecord(config, parameters, warns);

  debug('resolvedSecurity', resolvedSecurity);
  debug('resolvedParameter', resolvedParameter);

  const res = await performUseCase<TInput, TResult>({
    profileAst,
    mapAst,
    providerJson,
    usecase,
    input,
    security: resolvedSecurity,
    parameters: resolvedParameter,
  });

  return result(res, { warns });
}
