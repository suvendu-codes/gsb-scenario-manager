import { Injectable } from '@nestjs/common';
import { UpstreamPort } from '../../application/ports/upstream.port';
import {
  AGENT_OPERATIONS,
  MAPS,
  PROJECTS,
  SOLUTIONS,
} from '../../upstream.data';

@Injectable()
export class UpstreamAdapter implements UpstreamPort {
  getProjects() {
    return PROJECTS;
  }

  getSolutions(projectId: string) {
    return SOLUTIONS.filter((solution) => solution.projectId === projectId);
  }

  getAgentOperations(gsbFunctionalAreaId?: number) {
    return gsbFunctionalAreaId === undefined
      ? AGENT_OPERATIONS
      : AGENT_OPERATIONS.filter(
          (operation) => operation.gsbFunctionalAreaId === gsbFunctionalAreaId,
        );
  }

  getMaps(page: number, pageSize: number) {
    const start = (page - 1) * pageSize;
    return {
      count: MAPS.length,
      next: start + pageSize < MAPS.length ? page + 1 : null,
      previous: page > 1 ? page - 1 : null,
      results: MAPS.slice(start, start + pageSize),
    };
  }
}
