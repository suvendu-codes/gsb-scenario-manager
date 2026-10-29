import { z } from "zod";

import { configCatalogSchema } from "./catalog/schema";
import { scenarioConfigSchema } from "./schema";

/**
 * One schema with every `.strict()` object below it made tolerant; see `relax`. `keep` is true
 * inside arrays: those objects keep unknown keys instead of dropping them.
 */
function relaxSchema(schema: z.ZodTypeAny, keep = false): z.ZodTypeAny {
  if (schema instanceof z.ZodObject) {
    const shape = Object.fromEntries(
      Object.entries(schema.shape as z.ZodRawShape).map(([key, value]) => [
        key,
        relaxSchema(value, keep),
      ]),
    );
    return new z.ZodObject({
      ...schema._def,
      shape: () => shape,
      unknownKeys: keep ? "passthrough" : "strip",
    });
  }
  if (schema instanceof z.ZodArray) {
    return new z.ZodArray({ ...schema._def, type: relaxSchema(schema._def.type, true) });
  }
  if (schema instanceof z.ZodRecord) {
    return new z.ZodRecord({ ...schema._def, valueType: relaxSchema(schema._def.valueType, keep) });
  }
  if (schema instanceof z.ZodOptional) {
    return new z.ZodOptional({
      ...schema._def,
      innerType: relaxSchema(schema._def.innerType, keep),
    });
  }
  if (schema instanceof z.ZodNullable) {
    return new z.ZodNullable({
      ...schema._def,
      innerType: relaxSchema(schema._def.innerType, keep),
    });
  }
  if (schema instanceof z.ZodDefault) {
    return new z.ZodDefault({
      ...schema._def,
      innerType: relaxSchema(schema._def.innerType, keep),
    });
  }
  if (schema instanceof z.ZodEffects) {
    return new z.ZodEffects({ ...schema._def, schema: relaxSchema(schema._def.schema, keep) });
  }
  if (schema instanceof z.ZodUnion) {
    const [first, ...rest] = (schema._def.options as z.ZodTypeAny[]).map((option) =>
      relaxSchema(option, keep),
    );
    return new z.ZodUnion({ ...schema._def, options: [first, ...rest] });
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    type Option = z.ZodDiscriminatedUnionOption<string>;
    const options = (schema.options as Option[]).map((option) => relaxSchema(option, keep)) as [
      Option,
      ...Option[],
    ];
    return z.discriminatedUnion(schema.discriminator, options);
  }
  if (schema instanceof z.ZodIntersection) {
    return new z.ZodIntersection({
      ...schema._def,
      left: relaxSchema(schema._def.left, keep),
      right: relaxSchema(schema._def.right, keep),
    });
  }
  if (schema instanceof z.ZodLazy) {
    const getter = schema._def.getter;
    return new z.ZodLazy({ ...schema._def, getter: () => relaxSchema(getter(), keep) });
  }
  return schema;
}

/**
 * The same schema, but objects drop keys they do not know instead of rejecting them. Values,
 * ranges, enums and refinements are checked as before.
 *
 * Objects inside arrays keep the keys they don't know: an array (a station's schedule) is
 * written back whole, so dropping a field the server added would delete it on the next edit.
 * The server must accept back the fields it sent.
 *
 * The internal schemas are `.strict()` so that writes cannot carry a misspelt key. Responses
 * are read with the relaxed version: the API is still changing (a `map_version` may appear
 * inside a module, a new field in the catalog), and a field the client does not use yet must
 * not stop the page from loading.
 *
 * @param schema - A schema, usually with strict objects somewhere inside.
 * @returns A new schema; the one passed in is not changed.
 */
export function relax<T extends z.ZodTypeAny>(schema: T): T {
  return relaxSchema(schema) as T;
}

/** `GET`/`PATCH /scenarios/{id}/config` as the client reads it. */
export const scenarioConfigResponseSchema = relax(scenarioConfigSchema);

/** `GET /config/catalog` as the client reads it. */
export const configCatalogResponseSchema = relax(configCatalogSchema);
