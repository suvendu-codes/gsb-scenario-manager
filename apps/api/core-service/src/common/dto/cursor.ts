import { InvalidCursorError } from '../domain/domain-error.js';

export const encodeCursor = (payload: object) =>
  Buffer.from(JSON.stringify(payload)).toString('base64url');

export function decodeCursor<T>(raw: string): T {
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as T;
  } catch {
    throw new InvalidCursorError();
  }
}
