import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5_000,
      maxRedirects: 0,
    }),
  ],
  exports: [HttpModule],
})
export class SharedResilienceModule {}
