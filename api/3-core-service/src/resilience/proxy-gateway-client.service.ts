import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProxyGatewayClientService {
  constructor(private readonly http: HttpService) {}

  async post<T>(path: string, body: unknown): Promise<T> {
    const baseUrl = process.env.BFF_SERVICE_URL ?? 'http://localhost:3001';
    const { data } = await firstValueFrom(
      this.http.post<T>(`${baseUrl}${path}`, body),
    );
    return data;
  }
}
