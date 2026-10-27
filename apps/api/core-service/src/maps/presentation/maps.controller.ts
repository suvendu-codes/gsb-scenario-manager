import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { parseSort } from '../../common/dto/sort.dto.js';
import {
  SCENARIO_SORT_FIELDS,
  type ScenarioSortField,
} from '../../scenarios/application/ports/scenario.repository.js';
import { GetMapFolderUseCase } from '../application/use-cases/get-map-folder.use-case.js';
import { GetMapVersionAtUseCase } from '../application/use-cases/get-map-version-at.use-case.js';
import { GetMapVersionUseCase } from '../application/use-cases/get-map-version.use-case.js';
import { GetMapUseCase } from '../application/use-cases/get-map.use-case.js';
import { ListMapFoldersUseCase } from '../application/use-cases/list-map-folders.use-case.js';
import { ListMapScenariosUseCase } from '../application/use-cases/list-map-scenarios.use-case.js';
import { ListMapVersionsUseCase } from '../application/use-cases/list-map-versions.use-case.js';
import { ListScenariosQuery } from './dto/list-scenarios.query.js';
import { MapFolderParams, MapVersionParams } from './dto/map-params.js';
import {
  MapFolderListDto,
  MapFolderResponseDto,
  MapResponseDto,
  MapVersionListDto,
  MapVersionResponseDto,
  toMapFolderList,
  toMapFolderResponse,
  toMapResponse,
  toMapVersionList,
  toMapVersionResponse,
} from './dto/map-response.dto.js';

@Controller('maps')
export class MapsController {
  constructor(
    private readonly getMap: GetMapUseCase,
    private readonly getMapVersion: GetMapVersionUseCase,
    private readonly listMapVersions: ListMapVersionsUseCase,
    private readonly getMapVersionAt: GetMapVersionAtUseCase,
    private readonly listMapFolders: ListMapFoldersUseCase,
    private readonly getMapFolder: GetMapFolderUseCase,
    private readonly listMapScenarios: ListMapScenariosUseCase,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a map' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  @ApiOkResponse({ type: MapResponseDto })
  @ApiNotFoundResponse({ description: 'map_not_found: No such map' })
  getOne(@Param('id') mapId: string) {
    return withSafeListener(`GET /maps/${mapId}`, async () =>
      toMapResponse(await this.getMap.execute(mapId)),
    );
  }

  @Get(':id/version')
  @ApiOperation({ summary: 'Get the current version of a map' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  @ApiOkResponse({ type: MapVersionResponseDto })
  @ApiNotFoundResponse({ description: 'map_not_found: No such map' })
  getVersion(@Param('id') mapId: string) {
    return withSafeListener(`GET /maps/${mapId}/version`, async () =>
      toMapVersionResponse(await this.getMapVersion.execute(mapId)),
    );
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List versions of a map' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  @ApiOkResponse({ type: MapVersionListDto })
  @ApiNotFoundResponse({ description: 'map_not_found: No such map' })
  listVersions(@Param('id') mapId: string) {
    return withSafeListener(`GET /maps/${mapId}/versions`, async () =>
      toMapVersionList(mapId, await this.listMapVersions.execute(mapId)),
    );
  }

  @Get(':id/versions/:version')
  @ApiOperation({ summary: 'Get one version of a map' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  @ApiParam({ name: 'version', description: 'Map version (positive integer), e.g. 1' })
  @ApiOkResponse({ type: MapVersionResponseDto })
  @ApiNotFoundResponse({
    description: 'map_not_found / map_version_not_found: No such map or version',
  })
  getVersionAt(@Param() { id: mapId, version }: MapVersionParams) {
    return withSafeListener(`GET /maps/${mapId}/versions/${version}`, async () =>
      toMapVersionResponse(await this.getMapVersionAt.execute(mapId, version)),
    );
  }

  @Get(':id/folders')
  @ApiOperation({ summary: 'List folders of a map' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  @ApiOkResponse({ type: MapFolderListDto })
  @ApiNotFoundResponse({ description: 'map_not_found: No such map' })
  listFolders(@Param('id') mapId: string) {
    return withSafeListener(`GET /maps/${mapId}/folders`, async () =>
      toMapFolderList(mapId, await this.listMapFolders.execute(mapId)),
    );
  }

  @Get(':id/folders/:folderId')
  @ApiOperation({ summary: 'Get one folder of a map' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  @ApiParam({ name: 'folderId', description: 'Folder ID' })
  @ApiOkResponse({ type: MapFolderResponseDto })
  @ApiNotFoundResponse({
    description: 'map_not_found / map_folder_not_found: No such map or folder',
  })
  getFolder(@Param() { id: mapId, folderId }: MapFolderParams) {
    return withSafeListener(`GET /maps/${mapId}/folders/${folderId}`, async () =>
      toMapFolderResponse(await this.getMapFolder.execute(mapId, folderId)),
    );
  }

  @Get(':id/scenarios')
  @ApiOperation({ summary: 'List scenarios for a map' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  listScenarios(@Param('id') mapId: string, @Query() query: ListScenariosQuery) {
    return withSafeListener(`GET /maps/${mapId}/scenarios`, () =>
      this.listMapScenarios.execute({
        mapId,
        status: query.status,
        sort: parseSort<ScenarioSortField>(query.sort, SCENARIO_SORT_FIELDS, {
          field: 'updated_at',
          direction: 'desc',
        }),
      }),
    );
  }
}
