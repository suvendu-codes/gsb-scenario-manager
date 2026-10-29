import designSample from "./pps/design-sample.json";
import registryV2Large from "./pps/registry-v2-49.json";
import registryV2Small from "./pps/registry-v2-5.json";
import registryV3 from "./pps/registry-v3-17.json";
import casePickSizer from "./sizer/case-pick.json";
import ecomRtpSizer from "./sizer/ecom-rtp.json";
import multiMsioSizer from "./sizer/multi-msio.json";
import p2pBaselineSizer from "./sizer/p2p-baseline.json";
import relayCoexistSizer from "./sizer/relay-coexist.json";

/**
 * The upstream answers the mock API serves for each map, as fixture files. Only the mock route
 * handlers read them; the client gets them through the API and its mappers
 * (`features/scenario-config/upstream`).
 *
 * The files are kept exactly as captured, so a new capture replaces a file as it is:
 * - `pps/registry-*.json`: station records from the site registry (versions 2 and 3), as a list.
 * - `pps/design-sample.json` and `sizer/*.json`: answers in the shape of the API design
 *   (`{ map_id, pps }` and `{ map_id, bot_types }`).
 */
export type MapFixture = { pps: unknown; sizer: unknown };

/** The fixtures by map id. A map without one has no stations or bots in the mock. */
export const MAP_FIXTURES: Record<string, MapFixture> = {
  "ecom-rtp": { pps: registryV2Large, sizer: ecomRtpSizer },
  "multi-msio": { pps: registryV2Small, sizer: multiMsioSizer },
  "relay-coexist": { pps: registryV3, sizer: relayCoexistSizer },
  "case-pick": { pps: designSample, sizer: casePickSizer },
  "p2p-baseline": { pps: designSample, sizer: p2pBaselineSizer },
};
