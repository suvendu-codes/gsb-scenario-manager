import { Injectable } from '@nestjs/common';
import { ReplayEnvelopeDto } from './replay-envelope.dto';

@Injectable()
export class ReplayService {
  readOrderEvents(): ReplayEnvelopeDto[] {
    return [];
  }
}
