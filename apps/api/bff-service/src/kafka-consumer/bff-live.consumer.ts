import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { safeListener } from 'shared';
import { ORDER_EVENTS_TOPIC } from 'shared-types';
import { WsGateway } from '../gateway/ws.gateway';

@Controller()
export class BffLiveConsumer {
  private readonly logger = new Logger(BffLiveConsumer.name);

  constructor(private readonly wsGateway: WsGateway) {}

  private readonly onOrderEvents = safeListener(
    'BffLiveConsumer.handleLiveEvent',
    (payload: unknown) => {
      this.logger.debug('fan-out live event');
      this.wsGateway.emitLiveEvent(ORDER_EVENTS_TOPIC, payload);
    },
  );

  @EventPattern(ORDER_EVENTS_TOPIC)
  handleLiveEvent(@Payload() payload: unknown) {
    return this.onOrderEvents(payload);
  }
}
