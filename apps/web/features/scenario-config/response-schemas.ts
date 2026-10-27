import { z } from "zod";

import { configCatalogSchema } from "./catalog/schema";
import { scenarioConfigSchema } from "./schema";

/** One schema with every `.strict()` object below it made tolerant; see `relax`. */
function relaxSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodObject) {
    const shape = Object.fromEntries(
      Object.entries(schema.shape as z.ZodRawShape).map(([key, value]) => [
        key,
        relaxSchema(value),
      ]),
    );
    return new z.ZodObject({ ...schema._def, shape: () => shape, unknownKeys: "strip" });
  }
  if (schema instanceof z.ZodArray) {
    return new z.ZodArray({ ...schema._def, type: relaxSchema(schema._def.type) });
  }
  if (schema instanceof z.ZodRecord) {
    return new z.ZodRecord({ ...schema._def, valueType: relaxSchema(schema._def.valueType) });
  }
  if (schema instanceof z.ZodOptional) {
    return new z.ZodOptional({ ...schema._def, innerType: relaxSchema(schema._def.innerType) });
  }
  if (schema instanceof z.ZodNullable) {
    return new z.ZodNullable({ ...schema._def, innerType: relaxSchema(schema._def.innerType) });
  }
  if (schema instanceof z.ZodDefault) {
    return new z.ZodDefault({ ...schema._def, innerType: relaxSchema(schema._def.innerType) });
  }
  if (schema instanceof z.ZodEffects) {
    return new z.ZodEffects({ ...schema._def, schema: relaxSchema(schema._def.schema) });
  }
  if (schema instanceof z.ZodUnion) {
    const [first, ...rest] = (schema._def.options as z.ZodTypeAny[]).map(relaxSchema);
    return new z.ZodUnion({ ...schema._def, options: [first, ...rest] });
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    type Option = z.ZodDiscriminatedUnionOption<string>;
    const options = (schema.options as Option[]).map(relaxSchema) as [Option, ...Option[]];
    return z.discriminatedUnion(schema.discriminator, options);
  }
  if (schema instanceof z.ZodIntersection) {
    return new z.ZodIntersection({
      ...schema._def,
      left: relaxSchema(schema._def.left),
      right: relaxSchema(schema._def.right),
    });
  }
  if (schema instanceof z.ZodLazy) {
    const getter = schema._def.getter;
    return new z.ZodLazy({ ...schema._def, getter: () => relaxSchema(getter()) });
  }
  return schema;
}

/**
 * The same schema, but objects drop keys they do not know instead of rejecting them. Values,
 * ranges, enums and refinements are checked as before.
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
