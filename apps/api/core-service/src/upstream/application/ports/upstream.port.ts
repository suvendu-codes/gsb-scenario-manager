export interface UpstreamPort {
  getProjects(): unknown;
  getSolutions(projectId: string): unknown;
  getAgentOperations(gsbFunctionalAreaId?: number): unknown;
  getMaps(
    page: number,
    pageSize: number,
  ): {
    count: number;
    next: number | null;
    previous: number | null;
    results: unknown[];
  };
}

export const UPSTREAM = Symbol('UPSTREAM');
