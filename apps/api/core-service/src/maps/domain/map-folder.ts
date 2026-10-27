/** A folder of layout files that belongs to one map. `parentId` is another folder on that map. */
export class MapFolder {
  id!: string;
  mapId!: string;
  name!: string;
  path!: string;
  parentId!: string | null;
  updatedAt!: string;
}
