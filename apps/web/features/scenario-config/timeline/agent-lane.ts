import type { ConfigValues } from "../types";

/** The Agents lane: the share of the run all bots are available, and the outage share. */
export type Availability = {
  availablePct: number;
  outagePct: number;
  /** "40 HTM · 12 VTM". */
  fleet: string;
  bots: number;
};

/**
 * The Agents lane as the design draws it: available for the run less the outage share, then the
 * outage at the end. Where the outage falls is illustrative.
 */
export function availability(agent: ConfigValues["agent"]): Availability {
  const outagePct = Math.min(100, Math.max(0, agent.botOutagePct));
  return {
    availablePct: 100 - outagePct,
    outagePct,
    fleet: `${agent.fleet.htm} HTM · ${agent.fleet.vtm} VTM`,
    bots: agent.fleet.htm + agent.fleet.vtm,
  };
}
