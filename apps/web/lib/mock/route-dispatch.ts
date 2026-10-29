import { vi } from "vitest";

/** The `globalThis` keys the mock stores keep their data under. */
const MOCK_STORE_KEYS = ["mockScenarios", "mockDatasets", "mockConfigs"];

/** Where the mock API is mounted, the same as the app's default `API_BASE_URL`. */
const MOUNT = "/api";

type Handler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

type Route = {
  /** The path below the mount; each capture group is one route param, named in `params`. */
  pattern: RegExp;
  params: string[];
  /** The route module; its exports are the handlers by HTTP method. */
  load: () => Promise<object>;
};

/** The mock routes, by path below the mount. Add a route here when the mock grows one. */
const ROUTES: Route[] = [
  {
    pattern: /^\/config\/catalog$/,
    params: [],
    load: () => import("@/app/api/config/catalog/route"),
  },
  {
    pattern: /^\/scenarios\/([^/]+)\/config$/,
    params: ["id"],
    load: () => import("@/app/api/scenarios/[id]/config/route"),
  },
];

/**
 * Test helper: starts the mock API from its seed data, by dropping the cached modules and the
 * stores they keep on `globalThis`. Modules imported after this get fresh copies.
 */
export function resetMockApi(): void {
  vi.resetModules();
  for (const key of MOCK_STORE_KEYS) {
    delete (globalThis as Record<string, unknown>)[key];
  }
}

const notFound = (message: string) =>
  Response.json({ code: "NOT_FOUND", message }, { status: 404 });

/**
 * Test helper: a `fetch` that answers from the mock route handlers instead of the network, so
 * a test runs the real client (URL building, parsing, error reading) against the real mock.
 * Requests are matched by method and path below `/api`.
 */
export const mockApiFetch: typeof fetch = async (input, init) => {
  const request = new Request(
    new URL(input instanceof Request ? input.url : String(input), "http://mock.local"),
    init,
  );
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith(MOUNT)) return notFound(`No mock API at ${pathname}`);
  const path = pathname.slice(MOUNT.length);

  for (const route of ROUTES) {
    const match = route.pattern.exec(path);
    if (!match) continue;
    const handlers = (await route.load()) as Partial<Record<string, Handler>>;
    const handler = handlers[request.method];
    if (!handler)
      return Response.json(
        { code: "METHOD_NOT_ALLOWED", message: request.method },
        { status: 405 },
      );
    const params = Object.fromEntries(
      route.params.map((name, index) => [name, decodeURIComponent(match[index + 1])]),
    );
    return handler(request, { params: Promise.resolve(params) });
  }
  return notFound(`No mock route for ${request.method} ${path}`);
};
