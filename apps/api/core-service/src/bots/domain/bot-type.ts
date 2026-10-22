export class BotType {
  type!: string;
  name!: string;
  imageUrl!: string;
  count!: number;
}

/** The sizer's output for one map. */
export class MapBots {
  mapId!: string;
  botTypes!: BotType[];
}
