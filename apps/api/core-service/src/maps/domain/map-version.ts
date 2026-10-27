export class MapVersion {
  mapId!: string;
  /** Positive integer, the same `map_version` used by PPS. */
  version!: number;
  updatedAt!: string;
  /** The version returned by `GET /maps/:id/version`. */
  current!: boolean;
}
