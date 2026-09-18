import { Module } from '@nestjs/common';
import { SharedResilienceModule } from './shared-resilience.module';
import { CoreClientService } from './core-client.service';

@Module({
  imports: [SharedResilienceModule],
  providers: [CoreClientService],
  exports: [CoreClientService],
})
export class ResilienceModule {}
