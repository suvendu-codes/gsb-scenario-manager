import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CoreClientService {
  constructor(private readonly http: HttpService) {}

  async get<T>(path: string): Promise<T> {
    const baseUrl = process.env.CORE_SERVICE_URL ?? 'http://localhost:3002';
    const { data } = await firstValueFrom(
      this.http.get<T>(`${baseUrl}${path}`),
    );
    return data;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const baseUrl = process.env.CORE_SERVICE_URL ?? 'http://localhost:3002';
    const { data } = await firstValueFrom(
      this.http.post<T>(`${baseUrl}${path}`, body),
    );
    return data;
  }
}
