import { z } from 'zod';

/**
 * Shape of the scenario config blob. Several option sets are still open ("other options not
 * known yet"), so those are plain strings; closed sets are enums. Overrides mirror defaults with
 * every field optional (arrays are replaced wholesale).
 */

type Shape = z.ZodRawShape;
const deepPartial = <T extends Shape>(o: z.ZodObject<T>, nullable = false): z.ZodType =>
  z.object(
    Object.fromEntries(
      Object.entries(o.shape).map(([k, v]) => {
        const leaf = v instanceof z.ZodObject ? deepPartial(v as z.ZodObject<Shape>, nullable) : (v as z.ZodType);
        return [k, (nullable ? leaf.nullable() : leaf).optional()];
      }),
    ),
  );

const timeWindow = z.object({ start: z.string(), end: z.string() });

const WmsOrderDefaults = z.object({
  volume_multiplier: z.number(),
  distribution: z.string().meta({ description: 'e.g. as_in_dataset' }),
  data_window: timeWindow,
  order_types: z.array(z.enum(['inbound', 'outbound', 'replenishment', 'audit'])),
  critical_priority_pct: z.number(),
  release_pattern: z.enum(['waves', 'streaming']),
  number_of_waves: z.number().int(),
  pbt_window_hours: z.number(),
  order_cutoff: z.string(),
});

const AgentDefaults = z.object({
  fleet: z.array(z.object({ type: z.string(), count: z.number().int() })),
  outage_pct: z.number(),
  charging_enabled: z.boolean(),
});

const StationSharedDefaults = z.object({
  errors: z.object({ error_injection: z.boolean() }),
  order_handling: z.object({
    cross_station_rebalancing: z.boolean(),
    order_sequencing: z.enum(['fifo', 'priority_weighted', 'shortest_path']),
  }),
  pick_scheduler: z.object({
    strategy: z.string().meta({ description: 'e.g. max_ppf_with_pbt' }),
    weights: z.object({
      ppf: z.number(),
      pbt_sla: z.number(),
      pbt_breached: z.number(),
      pbt_risk_of_breach: z.number(),
      large_orders: z.number(),
      sku_consolidation: z.number(),
    }),
  }),
  queue_and_replenishment: z.object({
    queue_limit_per_station: z.number().int(),
    replenishment_threshold_pct: z.number(),
  }),
});

const PickOperation = z.object({
  bin_structure: z.enum(['front_only', 'front_back']),
  orders: z.object({
    scheduling_strategy: z.enum(['sequential', 'weighted_priority', 'staged_parallel']),
    order_sequence: z.string().meta({ description: 'e.g. as_given' }),
    uom: z.enum(['outers_only', 'strict', 'flexible']),
    inventory_reservation: z.enum(['soft', 'hard', 'hard_partial_allowed']),
    packing: z.enum(['pack_after_picking', 'pack_while_picking', 'box_required_per_order']),
    when_stock_runs_short: z.enum(['replan_first', 'short_pick_immediately']),
    allow_partial_picks: z.boolean(),
    single_uom_picking: z.boolean(),
    group_single_line_orders: z.boolean(),
    split_large_orders: z.boolean(),
  }),
  allocation_to_station: z.object({
    pick_flow: z.enum(['manual', 'automatic']),
    back_rack_selection: z.enum(['tier_priority', 'balanced', 'any_available']),
  }),
  picking_from_carrier: z.object({
    pick_confirmation: z.string().meta({ description: 'e.g. automatic_scan' }),
    when_item_missing: z.enum(['skip_to_next_order', 'wait_for_operator', 'quarantine_bin']),
    pick_from_opened_cases: z.boolean(),
    confirm_empty_slots: z.boolean(),
    low_stock_count_check: z.boolean(),
  }),
  picking_into_bin: z.object({
    pick_mode: z.enum(['standard', 'parallel']),
    docking: z.string().meta({ description: 'e.g. manual_imtu' }),
    bin_packing: z.enum(['running_bin', 'order_by_order', 'by_opportunity']),
    rack_release: z.enum(['when_list_scanned', 'when_picker_confirms', 'after_timer']),
    when_bin_is_full: z.enum(['stop_at_capacity', 'allow_large_orders', 'ignore_on_last_item']),
    bin_full_applies_to: z.enum(['all_bins', 'multi_order_bins_only']),
  }),
  bin_handling: z.object({
    bin_release_timing: z.enum(['early', 'late']),
    bin_assignment: z.enum(['shuffle_as_needed', 'fixed_map']),
    early_bin_release: z.enum(['off', 'complete_orders_only', 'incomplete_allowed']),
    bin_grouping: z.enum(['off', 'round_robin', 'default_strategy']),
    use_bin_volume: z.boolean(),
    show_bin_age: z.boolean(),
  }),
  operator_aids: z.object({
    one_press_confirmation: z.boolean(),
    validate_box_labels_lpn: z.boolean(),
    show_next_item_early: z.boolean(),
    reuse_totes_immediately: z.boolean(),
    prompt_remove_empty_totes: z.boolean(),
    allow_carrier_change: z.boolean(),
  }),
  clearing_and_labels: z.object({
    bin_release_side: z.enum(['front', 'back', 'either']),
    bin_clearing: z.enum(['automatic', 'by_operator', 'from_picking_side']),
    pick_labels_ppfl: z.string().meta({ description: 'e.g. none' }),
    invoice_printing: z.enum(['dont_print', 'print_on_release', 'print_and_hold']),
  }),
});

const ScheduleEntry = z.object({
  mode: z.enum(['pick', 'put', 'audit', 'off']),
  hours: z.number(),
  tea_breaks: z.array(z.unknown()),
});

const StationLevelDefaults = z.object({
  schedule: z.array(ScheduleEntry),
  structure: z.object({
    front_operation: z.enum(['single_front', 'dual_front']),
    front_positions: z.number().int(),
    staffed_positions: z.number().int(),
    back_operator: z.enum(['manual', 'shuttle']),
    picking_destination: z.enum(['tote', 'packing_box']),
    carrier_association_side: z.enum(['front', 'back']),
    bin_clearing_side: z.enum(['back', 'front']),
    staffed_back_seats: z.number().int(),
  }),
  operations: z.object({
    pick: PickOperation,
    put: z.record(z.string(), z.unknown()).meta({ description: 'Not defined yet' }),
    audit: z.record(z.string(), z.unknown()).meta({ description: 'Not defined yet' }),
  }),
});

const StationLevelOverride = deepPartial(StationLevelDefaults);

export const ScenarioConfigSchema = z.object({
  wms_order: z.object({
    defaults: WmsOrderDefaults,
    overrides: deepPartial(WmsOrderDefaults),
  }),
  agent: z.object({
    defaults: AgentDefaults,
    overrides: deepPartial(AgentDefaults),
  }),
  station: z.object({
    shared: z.object({
      defaults: StationSharedDefaults,
      overrides: deepPartial(StationSharedDefaults),
    }),
    station_level: z.object({
      defaults: StationLevelDefaults,
      overrides: z
        .record(z.string(), StationLevelOverride)
        .meta({ description: 'Per-station overrides keyed by station id (e.g. PPS-101)' }),
    }),
  }),
});

/**
 * Update payload: only `overrides` can be sent. A `null` leaf resets that override to its default.
 */
const OverridesPatch = (o: z.ZodObject<Shape>) => z.object({ overrides: deepPartial(o, true) }).optional();

export const ScenarioConfigPatchSchema = z.object({
  wms_order: OverridesPatch(WmsOrderDefaults),
  agent: OverridesPatch(AgentDefaults),
  station: z
    .object({
      shared: OverridesPatch(StationSharedDefaults),
      station_level: z
        .object({
          overrides: z.record(z.string(), deepPartial(StationLevelDefaults, true)),
        })
        .optional(),
    })
    .optional(),
});
