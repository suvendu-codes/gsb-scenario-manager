export interface MapGatewayPort {
  getMap(url?: string): Promise<unknown>;
}

export const MAP_GATEWAY = Symbol('MAP_GATEWAY');
