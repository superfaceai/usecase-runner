import { AssertionError } from '@superfaceai/ast';
import { SyntaxError } from '@superfaceai/parser';

export abstract class BaseError extends Error {
  constructor(
    private shortMessage: string,
    private longLines: string[],
    private hints: string[],
  ) {
    super(shortMessage);

    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, BaseError.prototype);

    this.name = new.target.name;
    this.message = this.formatLong();
  }

  /**
   * Formats this error into a one-line string
   */
  formatShort(): string {
    return this.shortMessage;
  }

  /**
   * Formats this error into a possible multi-line string with more context, details and hints
   */
  formatLong(): string {
    let result = this.shortMessage;

    if (this.longLines.length > 0) {
      result += '\n';
      for (const line of this.longLines) {
        result += '\n' + line;
      }
    }

    if (this.hints.length > 0) {
      result += '\n';
      for (const hint of this.hints) {
        result += '\nHint: ' + hint;
      }
    }

    return result + '\n';
  }

  get [Symbol.toStringTag](): string {
    return this.name;
  }

  override toString(): string {
    return this.formatLong();
  }
}

export class MissingEnvVariableError extends BaseError {
  constructor(readonly variable: string) {
    super(`Environment variable ${variable} not found`, [], []);

    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, MissingEnvVariableError.prototype);
  }
}

export class ParseError extends BaseError {
  constructor(shortMessage: string, longLines: string[], hints: string[]) {
    super(shortMessage, longLines, hints);

    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, ParseError.prototype);
  }

  static fromSyntaxError(err: SyntaxError): ParseError {
    return new ParseError(
      err.message,
      [err.formatVisualization()],
      [err.formatHints()],
    );
  }

  static fromAssertionError(err: AssertionError): ParseError {
    return new ParseError(err.message, err.path, []);
  }
}
