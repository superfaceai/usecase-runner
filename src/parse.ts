import {
  ProviderJson,
  assertProviderJson,
  ProfileDocumentNode,
  MapDocumentNode,
  AssertionError,
} from '@superfaceai/ast';
import Parser, { Source, SyntaxError } from '@superfaceai/parser';
import { ParseError } from './errors';

export async function parseProfile(
  profile: string,
): Promise<ProfileDocumentNode> {
  try {
    return await Parser.parseProfile(new Source(profile));
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw ParseError.fromSyntaxError(err);
    }

    throw err;
  }
}

export async function parseMap(map: string): Promise<MapDocumentNode> {
  try {
    return await Parser.parseMap(new Source(map));
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw ParseError.fromSyntaxError(err);
    }

    throw err;
  }
}

export async function parseProvider(provider: string): Promise<ProviderJson> {
  try {
    const providerJson: ProviderJson = JSON.parse(provider);
    return assertProviderJson(providerJson);
  } catch (err) {
    if (err instanceof AssertionError) {
      throw ParseError.fromAssertionError(err);
    }

    throw err;
  }
}
