import { MissingEnvVariableError } from './errors';

describe('errors', () => {
  describe('MissingEnvVariableError', () => {
    it('has name equal to MissingEnvVariableError', () => {
      const e = new MissingEnvVariableError('variable');
      expect(e.name).toBe('MissingEnvVariableError');
    });
  });
});
