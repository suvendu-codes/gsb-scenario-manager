import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CircuitBreaker } from 'shared';
import { appConfig } from '../config';
import { MapGatewayPort } from './application/ports/map-gateway.port';

@Injectable()
export class ProxyGatewayClientService implements MapGatewayPort {
  constructor(private readonly http: HttpService) {}

  async post<T>(path: string, body: unknown): Promise<T> {
    const baseUrl = process.env.BFF_SERVICE_URL ?? 'http://localhost:3001';
    const { data } = await firstValueFrom(
      this.http.post<T>(`${baseUrl}${path}`, body),
    );
    return data;
  }

  @CircuitBreaker()
  async getMap(url = String(appConfig.get('map_api'))): Promise<unknown> {
    const { data } = await firstValueFrom(this.http.get<unknown>(url));
    return data;
  }
}
