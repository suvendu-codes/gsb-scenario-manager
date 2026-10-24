import type { ModulePanels } from "../panel";
import { AgentPanel } from "./agent/AgentPanel";
import { ConfiguredStationPanel } from "./station/ConfiguredStationPanel";
import { WmsPanel } from "./wms/WmsPanel";

/** The panel of each config module, to pass to `ConfigPanel`. */
export const configPanels: ModulePanels = {
  wms: WmsPanel,
  station: ConfiguredStationPanel,
  agent: AgentPanel,
};
