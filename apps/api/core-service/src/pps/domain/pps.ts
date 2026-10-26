export class PpsScheduleEntry {
  hours!: number;
  mode!: string;
}

/** Illustrative shape: the LLD hasn't settled the station config or how a schedule shows a gap. */
export class PpsConfig {
  modes!: string[];
  schedule!: PpsScheduleEntry[];
}

export class Pps {
  ppsId!: string;
  type!: string;
  category!: string;
  location!: string;
  pickDirection!: number;
  status!: string;
  eligibleSystem!: string;
  ppsUrl!: string;
  config!: PpsConfig;
}

/** The PPS stations of one map: identity plus default configuration. */
export class MapPps {
  mapId!: string;
  pps!: Pps[];
}
