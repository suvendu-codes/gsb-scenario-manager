/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { jest } from '@jest/globals';
import { of } from 'rxjs';

jest.unstable_mockModule('shared', () => ({
  CircuitBreaker:
    () => (_target: unknown, _key: unknown, descriptor: PropertyDescriptor) =>
      descriptor,
}));

const { ProxyGatewayClientService } =
  await import('./proxy-gateway-client.service');

describe('ProxyGatewayClientService.getMap', () => {
  it('GETs the map_api url', async () => {
    const http = {
      get: jest.fn().mockReturnValue(of({ data: { id: 1 } })),
    };
    const service = new ProxyGatewayClientService(http);

    await expect(service.getMap('https://example.test/map')).resolves.toEqual({
      id: 1,
    });
    expect(http.get).toHaveBeenCalledWith('https://example.test/map');
  });
});
