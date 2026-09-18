import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectsModule } from './projects/projects.module';
import { ScenariosModule } from './scenarios/scenarios.module';
import { ConfigModulesModule } from './config-modules/config-modules.module';
import { ReplayModule } from './replay/replay.module';
import { OrchestrationModule } from './orchestration/orchestration.module';
import { OrderEmulatorModule } from './emulator-services/order-emulator/order-emulator.module';
import { AgentEmulatorModule } from './emulator-services/agent-emulator/agent-emulator.module';
import { OperatorEmulatorModule } from './emulator-services/operator-emulator/operator-emulator.module';
import { MetricsModule } from './metrics/metrics.module';
import { ResilienceModule } from './resilience/resilience.module';

@Module({
  imports: [
    ProjectsModule,
    ScenariosModule,
    ConfigModulesModule,
    ReplayModule,
    OrchestrationModule,
    OrderEmulatorModule,
    AgentEmulatorModule,
    OperatorEmulatorModule,
    MetricsModule,
    ResilienceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
