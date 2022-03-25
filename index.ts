import {
  MapDocumentNode,
  ProfileDocumentNode,
  ProviderJson,
} from '@superfaceai/ast';
import { BoundProfileProvider } from '@superfaceai/one-sdk';
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

export type PerformOpts<TInput> = {
  profileAst: ProfileDocumentNode;
  mapAst: MapDocumentNode;
  provider: ProviderJson;
  usecase: string;
  input?: TInput;
  parameters?: Record<string, string>;
};

async function perform({
  profileAst,
  mapAst,
  provider,
  usecase,
  input,
  parameters,
}: PerformOpts<any>) {
  const boundProvider = new BoundProfileProvider(
    profileAst,
    mapAst,
    provider.name,
    {
      services: new ServiceSelector(provider.services, provider.defaultService),
      security: [], // TODO: I need to uncover how this is created. Too many layers. And I am worried it will be hard to reuse as it is private https://github.com/superfaceai/one-sdk-js/blob/c6ed48b6e58e02cde11b0baa6615b5aa4c4f15ba/src/client/profile-provider.ts#L634
    }
  );

  return await boundProvider.perform(usecase, input, parameters);
}

async function main() {
  const usecase = await loadUsecase();

  const profileAst = await parseProfile(new Source(usecase.profile));
  const mapAst = await parseMap(new Source(usecase.map));
  const provider = JSON.parse(usecase.provider);

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
