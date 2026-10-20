import { configCatalog } from "@/features/scenario-config/catalog";

/**
 * Mock `GET /api/config/catalog`: the field definitions, scheduler presets, stations and bot
 * types the config panel is built from. It holds no values; those come from the scenario config.
 */
export async function GET(): Promise<Response> {
  return Response.json(configCatalog);
}
