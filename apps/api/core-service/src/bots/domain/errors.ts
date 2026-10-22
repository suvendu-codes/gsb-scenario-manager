import { DomainError } from '../../common/domain/domain-error.js';

/** No such project. A 404 (not a 403/422) because the project id is in the URL. */
export class ProjectNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Project ${id} not found`, 'not_found');
  }
}

export class MapNotFoundError extends DomainError {
  constructor(projectId: string, mapId: string) {
    super(`Map ${mapId} not found in project ${projectId}`, 'not_found');
  }
}

export class NotPermittedError extends DomainError {
  constructor(projectId: string) {
    super(`Not assigned to project ${projectId}`, 'forbidden');
  }
}
