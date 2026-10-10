import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { DomainError, DomainErrorKind } from '../domain/domain-error';

const STATUS: Record<DomainErrorKind, HttpStatus> = {
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  unavailable: HttpStatus.SERVICE_UNAVAILABLE,
  bad_gateway: HttpStatus.BAD_GATEWAY,
};

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter<DomainError> {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(error: DomainError, host: ArgumentsHost) {
    const statusCode = STATUS[error.kind];
    this.adapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      { statusCode, error: error.name, message: error.message },
      statusCode,
    );
  }
}
