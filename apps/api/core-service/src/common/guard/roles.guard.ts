import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../decorator/roles.decorator.js';

// Expects an upstream auth guard to have attached `request.user` with a `role`.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: { role?: Role } }>();
    if (!user) throw new ForbiddenException('User not authenticated');

    if (!user.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permission');
    }
    return true;
  }
}
