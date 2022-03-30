import { ParseError } from './errors';
import { parseProfile } from './parse';

describe('parse', () => {
  describe('parseProfile', () => {
    it('throws parse error for invalid profile', async () => {
      await expect(parseProfile('bleh blah')).rejects.toThrow(ParseError);
    });
  });
});
