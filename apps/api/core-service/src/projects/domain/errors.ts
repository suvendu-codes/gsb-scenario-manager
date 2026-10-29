import { DomainError } from '../../common/domain/domain-error.js';

/** No such project. A 404 (not a 403/422) because the project id is in the URL. */
export class ProjectNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Project ${id} not found`, 'not_found', 'project_not_found');
  }
}
