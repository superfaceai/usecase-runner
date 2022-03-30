import {
  Result as BaseResult,
  Ok as BaseOk,
  Err as BaseErr,
} from '@superfaceai/one-sdk';

export type Metadata = {
  warns?: any;
};

export class Ok<T, E> extends BaseOk<T, E> {
  constructor(readonly value: T, readonly meta?: Metadata) {
    super(value);
  }
}

export class Err<T, E> extends BaseErr<T, E> {
  constructor(readonly error: E, readonly meta?: Metadata) {
    super(error);
  }
}

export type Result<T, E> = Ok<T, E> | Err<T, E>;
export const ok = <T, E>(value: T, meta?: Metadata): Ok<T, E> =>
  new Ok(value, meta);
export const err = <T, E>(err: E, meta?: Metadata): Err<T, E> =>
  new Err(err, meta);
export const result = <T, E>(
  res: BaseResult<T, E>,
  meta?: Metadata,
): Result<T, E> => (res.isOk() ? ok(res.value, meta) : err(res.error, meta));
