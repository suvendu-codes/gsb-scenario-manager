import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { WsGateway } from '../gateway/ws.gateway';

@Controller()
export class BffLiveConsumer {
  private readonly logger = new Logger(BffLiveConsumer.name);

  constructor(private readonly wsGateway: WsGateway) {}

  @EventPattern('order.events')
  handleLiveEvent(@Payload() payload: unknown) {
    this.logger.debug('fan-out live event');
    this.wsGateway.emitLiveEvent('order.events', payload);
  }
}
