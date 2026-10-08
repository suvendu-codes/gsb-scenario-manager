import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectsModule } from './projects/projects.module';
import { MapsModule } from './maps/maps.module';
import { RunsModule } from './runs/runs.module';
import { ScenariosModule } from './scenarios/scenarios.module';
import { ConfigModulesModule } from './config-modules/config-modules.module';
import { ReplayModule } from './replay/replay.module';
import { OrchestrationModule } from './orchestration/orchestration.module';
import { OrderEventsModule } from './order-events/order-events.module';
import { OrderEmulatorModule } from './emulator-services/order-emulator/order-emulator.module';
import { AgentEmulatorModule } from './emulator-services/agent-emulator/agent-emulator.module';
import { OperatorEmulatorModule } from './emulator-services/operator-emulator/operator-emulator.module';
import { MetricsModule } from './metrics/metrics.module';
import { ResilienceModule } from './resilience/resilience.module';
import { UpstreamModule } from './upstream/upstream.module';

@Module({
  imports: [
    ProjectsModule,
    MapsModule,
    RunsModule,
    ScenariosModule,
    ConfigModulesModule,
    ReplayModule,
    OrchestrationModule,
    OrderEventsModule,
    OrderEmulatorModule,
    AgentEmulatorModule,
    OperatorEmulatorModule,
    MetricsModule,
    ResilienceModule,
    UpstreamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
