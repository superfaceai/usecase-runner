import {
  ProviderJson,
  assertProviderJson,
  ProfileDocumentNode,
  MapDocumentNode,
} from '@superfaceai/ast';
import Parser, { Source } from '@superfaceai/parser';

export async function parseProfile(
  profile: string,
): Promise<ProfileDocumentNode> {
  try {
    return await Parser.parseProfile(new Source(profile));
  } catch (err) {
    throw err; // TODO: wrap to own error
  }
}

export async function parseMap(map: string): Promise<MapDocumentNode> {
  try {
    return await Parser.parseMap(new Source(map));
  } catch (err) {
    throw err; // TODO: wrap to own error
  }
}

export async function parseProvider(provider: string): Promise<ProviderJson> {
  try {
    const providerJson: ProviderJson = JSON.parse(provider);
    return assertProviderJson(providerJson);
  } catch (err) {
    throw err; // TODO: wrap to own error
  }
}
