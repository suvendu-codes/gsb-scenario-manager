import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const SYSTEM_USER = 'system';

/**
 * The acting user, taken from the `x-user-email` header.
 *
 * The header is trusted as-is: this service does no authentication of its own and relies on the
 * gateway in front of it to set the header. Callers that send none are recorded as `system`.
 */
export const UserEmail = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const header = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>().headers['x-user-email'];
  const value = Array.isArray(header) ? header[0] : header;
  return value?.trim() || SYSTEM_USER;
});
