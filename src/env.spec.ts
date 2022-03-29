import { resolveEnv, resolveEnvRecord } from './env';
import { BaseError, MissingEnvVariableError } from './errors';

describe('env', () => {
  describe('resolveEnv', () => {
    it('throws Error for missing variable', () => {
      expect(() => resolveEnv({}, '$MYVAR')).toThrowError(
        MissingEnvVariableError,
      );
    });
  });

  describe('resolveEnvRecord', () => {
    it('appends warning', () => {
      const warns: BaseError[] = [];

      resolveEnvRecord({}, { myvar: '$MYVAR' }, warns);

      expect(warns.length).toBe(1);
    });
  });
});
