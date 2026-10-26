# Scenario config: schema decision table (v2 proposal)

Status: **proposal, needs sign-off** before the wire layer and mock API (PRs 12 onward) are built.
Ticket: SMF-294. Owner of the decisions: Suvendu; API counterpart: core-service team.

## 1. Why this document exists

Three sources describe the scenario config, and they disagree:

| Source | What it is | Date |
| --- | --- | --- |
| **LLD** | Confluence "Scenario Manager - Low Level Design", the v1 service API | about 9 Oct |
| **HTML prototype** | `Timeline table fixed (2).html`, "timeline prototype 2" (the live UI is its inner iframe, lines 982-2633) | 23 Oct |
| **Current build** | The config page in PRs #19-#28, built from the Foundry artifact, with our own mock API | 14-20 Oct |

This table settles, field by field, what the config looks like on the wire and inside the client.

### Rules used to settle conflicts

1. **UI-visible fields and behaviour follow the HTML** (it is the newest design). Where that differs from the LLD, the
   difference is listed in section 5 as a **proposed LLD amendment**.
2. **API mechanics follow the LLD** (merge-patch, versioning, error body, lookups) unless section 5 proposes a change.
3. **Wire format is the LLD's** (nested modules, `snake_case`). The client keeps its own internal model and maps to and
   from the wire in one adapter (PR 12), so the editor, panels and tests do not change shape.
4. Things the HTML does not mention (search, undo/redo, the issues list, the Structure editor) are **kept**; the
   prototype is a visual spec, not a full one. Hardware sections (gravity induction, EasyLoop) exist in neither the HTML
   nor the LLD and are **dropped**.

Status words used below: **SAME** (identical in HTML, LLD and build), **CHANGED** (exists but differs), **NEW** (not in
the LLD/build), **MOVED** (same field, different module), **DROPPED**.

## 2. API mechanics

| # | Topic | LLD | Our build today | Decision |
| --- | --- | --- | --- | --- |
| M1 | Read | `GET /v1/scenarios/{id}` returns each module as `{defaults, overrides, custom_paths}`, plus `version` (ETag) and `defaults_version` | `GET /api/scenarios/{id}/config` returns `{defaults, overrides, issues, ...}` with flat paths | Adopt the LLD shape on the wire; adapter builds the flat internal model |
| M2 | Write | `PATCH /v1/scenarios/{id}`, merge-patch on each module's `overrides` (objects merge, arrays replaced whole, `null` removes), response lists `changes[]` and `updated_modules` | `PATCH .../config` with `{set, reset}` on flat dot paths | Adopt the LLD; adapter turns our `{set, reset}` into a nested patch (`reset` -> `null`) |
| M3 | Customised | A field in `overrides` is custom, even if equal to the default (`matches_default: true`). The client never copies a default into overrides | The server drops a value equal to its default | Follow the LLD: "customised" comes from `custom_paths`; a custom value that equals the default still shows its reset button |
| M4 | Concurrency | `If-Match` with the version; stale -> `412 precondition_failed` with `details.current_version` | none (review S3) | Adopt; the editor sends the last version and refetches on 412 |
| M5 | Errors | `{ "error": { code, message, details, request_id } }`; 422 `validation_failed` with `details.errors[{path, reason}]` | `{ code, message, params?, path?, problems? }` (review M2) | Wire is the LLD's. The client maps `details` -> `params` and `details.errors[]` -> `problems[]`, so UI code is unchanged. See 5.A11 |
| M6 | Readiness | Not in GET. `POST .../runs` returns 422 `scenario_invalid` with `details.issues[]` (`config_incomplete`, `config_invalid`, `data_file_missing`, ...) | `issues` inside the config GET | Client computes issues for the Summary panel from config + datasets; the authoritative list comes from Trigger (PR 28) |
| M7 | Defaults | Server-owned, versioned, resolved on read; LLD open question 2 asks whether they are real or demo | Built in the client mock | Server-owned. The client never writes defaults |
| M8 | Stations | `GET /v1/projects/{p}/maps/{m}/pps` (shape marked illustrative) | Fixed list of 6 in the catalog (review M1) | Stations come from the map's `pps` lookup; registry fields are being mapped in the stations discussion |
| M9 | Bots | `GET .../sizer` gives bot types and counts | Fixed 10 + 10 | Fleet defaults come from the sizer |
| M10 | Station overrides | `station.shared.overrides` and `station_level.overrides` keyed by `pps_id`; no "apply to" or "keeps own" lists | `station.apply` / `station.override` stored (review S4) | No lists on the wire. "Apply to" targets are editor UI state; "keeps its own" is derived by comparing a station with the majority of its type (as the HTML does) |
| M11 | Preset | `pick_scheduler.strategy` is stored | Preset derived from weights, not stored | The client derives the preset and writes `strategy` as the matching id, or `custom` |
| M12 | Statuses | `draft, active, completed, failed, cancelled` | `draft, active, completed` | Add `failed` and `cancelled` to the client |
| M13 | Ids | `pps_id` such as `PPS-101` | `PPS-101` | Opaque strings, no dots. The upstream sample uses numbers (`1`..`5`); the label format is decided with the stations discussion |

## 3. Config fields

Columns: HTML label (source), wire path (LLD name, or **proposed**), type / range / step / unit, default, status.
Internal paths are not listed; the adapter table in PR 12 holds them.

### 3.1 `wms_order`

| HTML label | Wire path | Type, range | Default | Status |
| --- | --- | --- | --- | --- |
| Volume multiplier | `volume_multiplier` | number 0.5-2.5, step 0.25, shown "1x" | 1 | CHANGED (build allows 0.25-5) |
| Outbound shape | `distribution` | `as_in_dataset`, `flatline`, `pareto`, `staggered` | `as_in_dataset` | HTML keeps it in state but does not show it in the live panel. Kept on the wire, hidden in the UI (open question Q4) |
| Data window start / end | `data_window.start`, `.end` | "HH:MM", whole hours, 00:00-24:00, start before end | 00:00 / 24:00 | SAME |
| Order types | `order_types` | array of `inbound`, `outbound`; at least one | both | CHANGED (LLD lists four) |
| Critical priority orders | `critical_priority_pct` | number 0-100, step 5 | 10 | SAME; HTML label shows "%/h" while its help says "share of orders" (Q5) |
| Batching / wave rule | `release_pattern` | `waves`, `streaming` | `waves` | SAME |
| No. of waves | `number_of_waves` | int 1-24, only for `waves` | 4 | SAME |
| PBT window | `pbt_window_hours` | number 0.5-24, step 0.5 | 2 | SAME |
| Cutoff time | `order_cutoff` | "HH:MM", whole hours 00:00-23:00 | "18:00" | SAME |
| Order sequencing | `order_sequencing` | `fifo`, `priority_weighted`, `shortest_path` | `fifo` | MOVED here from `station.shared.order_handling` |

### 3.2 `agent`

| HTML label | Wire path | Type, range | Default | Status |
| --- | --- | --- | --- | --- |
| Quicktron HTM / VTM bots | `fleet[{type, count}]` | `quicktron_htm`, `quicktron_vtm`; int 0-200 | sizer's count (HTML: 10 / 10) | SAME |
| Bot outage | `outage_pct` | int 0-50, step 1 | 5 | SAME |
| HTM / VTM charging time | **`charging_pct`** `{quicktron_htm, quicktron_vtm}` | int 0-50, step 1, share of the run | 10 / 10 | NEW. Replaces `charging_enabled` |
| HTM / VTM turning time | **`turning_pct`** `{quicktron_htm, quicktron_vtm}` | int 0-50, step 1 | 3 / 3 | NEW |

Per-type objects are proposed instead of adding fields to the `fleet` array, because arrays are replaced whole by a
merge-patch and objects merge field by field.

### 3.3 `station.shared` (site-wide)

| HTML label | Wire path | Type, range | Default | Status |
| --- | --- | --- | --- | --- |
| Percentage of time in error | **`errors.time_in_error_pct`** | int 0-50, step 1 | 5 | CHANGED. Replaces `errors.error_injection` (boolean) |
| Pick scheduler (preset) | `pick_scheduler.strategy` | `max_ppf_with_pbt`, `pbt_fifo`, `max_ppf_ignoring_pbt`, `breached_order`, `pick_clean`, `returns_first`, `custom` | `max_ppf_with_pbt` | SAME (written by the client, see M11) |
| Weights | `pick_scheduler.weights.{ppf, pbt_sla, pbt_breached, pbt_risk_of_breach, large_orders, sku_consolidation}` | int 0-5 | 5, 4, 5, 3, 1, 2 | SAME |
| Replenishment Class A / B / C | **`replenishment_threshold_pct`** `{class_a, class_b, class_c}` | int 0-100, step 5 | 20 each | CHANGED (LLD has one number) |

### 3.4 `station_level` (defaults once, overrides per `pps_id`)

| HTML label | Wire path | Type, range | Default | Status |
| --- | --- | --- | --- | --- |
| Schedule blocks | `schedule[{mode, hours, tea_breaks, breaks}]` | at most 3 blocks, one per mode (`pick`, `put`, `audit`), `hours` step 0.5, at least 0.5, blocks add up to the run length. **No `off`**; an empty schedule means the station is unassigned | Pick 4h, Put 4h | CHANGED |
| Tea break | `tea_breaks[{pattern, duration_minutes, count}]` | `staggered` or `random`; 5-60 min, step 5; count 1-6 | none | NEW item shape (LLD has `[]`). The build allowed 5-120 min |
| Break | **`breaks[{every_hours, duration_hours}]`** | every 0.5 to block length, step 0.5; for 0.25-2h, step 0.25 | block 1: every 2.5h for 0.5h; block 2: every 2h for 0.5h | NEW |
| Modes a station may run | read from the registry (`allowed_modes`) | subset of pick, put, audit | all | NEW constraint. A Split station with `two_stage_variant` on cannot run Put |
| Dual-front operation | `structure.front_operation` | `single_front`, `dual_front` | `single_front` | SAME as LLD. HTML defines it in state but shows no control (kept) |
| Front positions | `structure.front_positions` | 1 or 2 | 1 | SAME (kept) |
| Front seats filled | `structure.staffed_positions` | 0 to front positions | 1 | SAME (kept) |
| Back operator | `structure.back_operator` | `manual`, `shuttle` | `manual` | SAME (kept) |
| Picking destination | `structure.picking_destination` | `tote`, `packing_box` | `tote` | SAME (kept) |
| Carrier association side | `structure.carrier_association_side` | `front`, `back` | `front` | SAME (kept) |
| Bin clearing side | `structure.bin_clearing_side` | `back`, `front` | `back` | SAME (kept) |
| Back seats filled | `structure.staffed_back_seats` | 0-2 | 1 | SAME (kept) |
| Pick / Put / Audit variance | **`variance.{pick,put,audit}_seconds`** | int 0-9999, step 5, seconds | 0 | NEW ("operator working time variance") |
| Queue limit | **`limits.queue_limit`** | int 1-50 | 10 | MOVED from `shared.queue_and_replenishment` |
| Cross-station rebalancing | **`limits.cross_station_rebalancing`** | boolean | true | MOVED from `shared.order_handling` |
| Operations | `operations.pick/put/audit` | see 3.6 | | Deferred (PR 29) |

### 3.5 Station Setup fields by hardware type (HTML lines 2127-2133)

Hardware type (Standard, Split, Roll cage) is a **client-side grouping**; it is not on the wire. A type-level edit is
written to every station of that type. Wire path: `station_level.<defaults|overrides>.setup.<key>`.

| Type | Key (HTML label) | Control, range | Default |
| --- | --- | --- | --- |
| Standard | `pick_positions` (Pick positions) | number 1-4 | 1 |
| Standard | `queue_barcodes` | number 0-10 | 3 |
| Standard | `bin_wall_size` (Bin wall size) | select 12 / 24 | 12 |
| Standard | `mode_limit_pick`, `_put`, `_audit`, `_search` (In/out limit) | number 1-50 each | 12, 7, 6, 9 |
| Standard | `pick_front_type`, `pick_back_seat` | read-only text | "1 seat (front_N)", "1 seat (back_N)" |
| Split | `queue_barcodes` | number 0-10 | 3 |
| Split | `bin_coordinate_plotting` | toggle, locked ("fixed") | on |
| Split | `two_stage_variant` (2-stage variant) | toggle; on means pick/audit only, no put | off |
| Split | `pick_front`, `pick_back_seats` | read-only text | "1 seat (front_1)", "2 seats" |
| Roll cage | `dock_station_type` | select `rollcage` / `mru` | `rollcage` |
| Roll cage | `dock_stations` (Dock stations) | number 1-10 | 4 |
| Roll cage | `rollcage_type_id`, `order_rc_mapping_behaviour` | text | empty |
| Roll cage | `mru_flow` | toggle | off |
| Roll cage | `seats`, `docking_type` | read-only text | "1 front seat · 1 back seat", "manual" |
| All three | `queue_limit`, `rebalance` | see 3.4 `limits` | 10, on |

Several of these look like registry data, not user choices (`queue_barcodes` is a list in the upstream PPS record,
`dock_stations` matches its `docking_stations` list, `pick_positions` matches `pps_points`). Which are read-only and
which editable is open question Q7.

### 3.6 Operations (deferred)

HTML line 2127 lists raw backend keys per type: 36 pick fields on Standard and Split, 34 on Roll cage
(no `pick_type`, `totes_required`, `pick_tote_side`, `auto_clear_bin`; adds locked `mru_flow` and `docking_type`),
put 5 fields (4 on Roll cage), audit 3 fields, with `showIf` dependencies (`pick_and_pass_phase_one_subsystem`,
`parallel_pick_random`, `sd_flow`, `ud_flow`, `ud_put_rtp_racks_count`). The LLD has nested named groups
(`orders`, `allocation_to_station`, `picking_from_carrier`, ...) and says put and audit are "not shared yet". Our current
catalog follows the LLD groups. **Decision: Operations is done last, once the backend key list per type is agreed.**

### 3.7 Run

| Setting | HTML | LLD | Proposal |
| --- | --- | --- | --- |
| Run length | fixed 8h (`dur`) | not in the config | read-only 8h; migration for an editable length is described in `defaults.ts` |
| Run start clock | 08:00 (`start`), so the ruler shows 0h-8h and the cutoff can fall "after run end" | none | needed to place the cutoff and the data window on the timeline (Q6) |

## 4. Not carried over

- Gravity induction and EasyLoop hardware sections (in the current build, in neither the HTML nor the LLD).
- Per-mode time in error (`errPick`, `errPut`, `errAudit`) and per-mode rebalancing (`reb`): in the HTML state but no UI.
- Operator shifts, `opPFD` and fault events: legacy code in the HTML's outer app, not in the live panel.
- Playhead, crosshair, and the drag handlers for cutoff, outage and breaks: dead code in the prototype.
- Block-boundary drag handle and the resizable panel: out of scope for this series.

## 5. Proposed LLD amendments

| # | Amendment | Reason |
| --- | --- | --- |
| A1 | `order_types` accepts only `inbound`, `outbound` | HTML |
| A2 | Move `order_sequencing` to `wms_order` | HTML shows it under the WMS demand profile |
| A3 | `errors.time_in_error_pct` (0-50) replaces `error_injection` | HTML |
| A4 | `agent.charging_pct` and `turning_pct` per bot type replace `charging_enabled` | HTML |
| A5 | `replenishment_threshold_pct` becomes `{class_a, class_b, class_c}` | HTML |
| A6 | Move `queue_limit_per_station` and `cross_station_rebalancing` to `station_level.limits` | HTML sets them per type or station |
| A7 | Define the `schedule` item: modes `pick`/`put`/`audit` only, at most 3 blocks, empty means unassigned; define `tea_breaks[]` and a new `breaks[]` item | HTML |
| A8 | Add `station_level.setup` (per-type fields in 3.5) and `variance` | HTML |
| A9 | Registry must expose each station's hardware type and `allowed_modes` (and `two_stage_variant`) so the client can group by type | HTML type panels |
| A10 | Add a run start clock (or fix it at 08:00) | Timeline placement |
| A11 | Say which cross-field rules PATCH enforces (for example "schedule adds up to the run length") and give them `reason` values, or move them to Trigger's `config_invalid` | LLD says PATCH checks shape only; our editor relies on the sum rule |
| A12 | `pick_scheduler.strategy` accepts `custom` | The HTML shows "Custom" when weights match no preset |
| A13 | Allow `failed` and `cancelled` in the scenario list rows | LLD "Scenario states" |

## 6. Open questions

| # | Question | For |
| --- | --- | --- |
| Q1 | Do you accept A1-A13 as the proposal to take to core-service? | Suvendu |
| Q2 | Are config defaults real (versioned, per map) or demo-only? (LLD open question 2) | core-service |
| Q3 | Should a custom value equal to its default keep the "Customized" badge (LLD) or go back to "Default" (build today)? | Suvendu |
| Q4 | Keep `distribution` ("Outbound shape") in the API but hidden in the UI? | Suvendu |
| Q5 | Critical priority: a share of orders (%) or a rate (%/h)? | PM |
| Q6 | Run start clock: fixed 08:00, or a scenario setting? | PM |
| Q7 | Which Station Setup fields come from the registry (read-only) and which are editable? | stations discussion |
| Q8 | Mapping from registry `type` (`manual`, `ppp_manual`, ...) to Standard / Split / Roll cage | stations discussion |
| Q9 | Do break step sizes follow the panel (0.25h) or the timeline code (5 min)? The HTML shows both | PM |
| Q10 | Should PATCH return the effective values too, or only `changes[]`? (the client can resolve them) | core-service |
