// Dummy fixtures mirroring the "Scenario Manager — Upstream Services Discovery" doc.
// Foundry (GraphQL) and GSB-BFF (REST) are stubbed until real upstream wiring lands.

export const PROJECTS = [
  {
    id: '69ccae538521d0adf3c03388',
    projectName: 'First Project',
    client: 'GreyOrange',
    site: 'First Project',
    siteType: 'warehouse',
    gsbId: 262,
    phase: 'design',
  },
  {
    // no gsbId: project with no GSB site yet (open question 1)
    id: '69ccae538521d0adf3c03399',
    projectName: 'Unsized Project',
    client: 'GreyOrange',
    site: 'Unsized Project',
    siteType: 'warehouse',
    gsbId: null,
    phase: 'draft',
  },
];

export const SOLUTIONS = [
  {
    id: '69e5b021902839c5779671b5',
    projectId: '69ccae538521d0adf3c03388',
    mfdDesignName: 'Greyorange-HQ',
    scenarioName: 'Base',
    status: 'Review',
    stage: 'Flow Design',
    sizerDetails: {
      sizerSolutions: [
        {
          gsbAreaId: 4,
          areaName: 'Inbound Area',
          operationType: 'relay',
          agentOperationId: '6a68c2b18bd1153c65242917',
          sizerSolution: { gsbSolutionDetails: { agentId: 7 } },
        },
        {
          gsbAreaId: 6,
          areaName: 'Reserve Area',
          operationType: 'case-pick',
          agentOperationId: '6a68c4a030179ea73a30f4fd',
          sizerSolution: { gsbSolutionDetails: { agentId: 9 } },
        },
      ],
    },
  },
  {
    // not sized yet -> client falls back to agent-operations
    id: '69e5b021902839c5779671b6',
    projectId: '69ccae538521d0adf3c03388',
    mfdDesignName: 'Greyorange-HQ',
    scenarioName: 'Peak',
    status: 'Draft',
    stage: 'Sizing',
    sizerDetails: null,
  },
];

export const AGENT_OPERATIONS = [
  {
    id: '6a68c2b18bd1153c65242917',
    name: 'Relay',
    gsbFunctionalAreaId: 4,
    gsbId: 7,
  },
  {
    id: '6a68c49630179ea73a30f4f6',
    name: 'Point To Point',
    gsbFunctionalAreaId: 6,
    gsbId: 4,
  },
  {
    id: '6a68c4a030179ea73a30f4fd',
    name: 'Case Pick',
    gsbFunctionalAreaId: 6,
    gsbId: 9,
  },
  {
    id: '6a76d6d14e5f7a0b77595ab0',
    name: 'RTP',
    gsbFunctionalAreaId: 4,
    gsbId: 1,
  },
];

export const MAPS = [
  {
    id: 2827,
    title: 'O&M_23Dec2025',
    source: 'import',
    is_active: true,
    current_draft_version: {
      id: 10274,
      map_tool_id: '17505',
      map_version: 2,
      is_draft: true,
    },
    current_active_version: {
      id: 9206,
      map_tool_id: '16468',
      map_version: 1,
      is_draft: false,
    },
    map_versions: [
      {
        id: 9206,
        map_version: 1,
        map_tool_id: '16468',
        is_draft: false,
        is_active: true,
      },
      {
        id: 10274,
        map_version: 2,
        map_tool_id: '17505',
        is_draft: true,
        is_active: false,
      },
    ],
  },
  {
    id: 3317,
    title: '161192',
    source: 'manual',
    is_active: false,
    current_draft_version: null,
    current_active_version: {
      id: 10730,
      map_tool_id: '18002',
      map_version: 3,
      is_draft: false,
    },
    map_versions: [
      {
        id: 10730,
        map_version: 3,
        map_tool_id: '18002',
        is_draft: false,
        is_active: true,
      },
    ],
  },
  {
    // never opened in Map Creator (open question 3)
    id: 3304,
    title: 'Map Layout 3304',
    source: 'manual',
    is_active: false,
    current_draft_version: {
      id: 10801,
      map_tool_id: null,
      map_version: 1,
      is_draft: true,
    },
    current_active_version: null,
    map_versions: [
      {
        id: 10801,
        map_version: 1,
        map_tool_id: null,
        is_draft: true,
        is_active: false,
      },
    ],
  },
];
