import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { appConfig } from '../config';

@Injectable()
export class ProxyGatewayClientService {
  constructor(private readonly http: HttpService) {}

  async post<T>(path: string, body: unknown): Promise<T> {
    const baseUrl = appConfig.bffServiceUrl;
    const { data } = await firstValueFrom(
      this.http.post<T>(`${baseUrl}${path}`, body),
    );
    return data;
  }
}
