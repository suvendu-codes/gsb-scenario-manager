import type { ConfigCatalog, ModuleId } from "./types";

/** A setting that matched a search: where it is and what it is called. */
export type SearchHit = {
  module: ModuleId;
  moduleLabel: string;
  /** Label of the section the setting is in. */
  section: string;
  label: string;
  hint?: string;
};

/** Everything searchable in a catalog: every field with the module and section it belongs to. */
function indexCatalog(catalog: ConfigCatalog): SearchHit[] {
  const entries: SearchHit[] = [];

  for (const catalogModule of catalog.modules) {
    for (const section of catalogModule.sections) {
      const add = (label: string, hint?: string) =>
        entries.push({
          module: catalogModule.id,
          moduleLabel: catalogModule.label,
          section: section.label,
          label,
          hint,
        });

      for (const field of section.fields) {
        add(field.label, field.hint);
        if (field.type === "weights") field.items.forEach((item) => add(item.label, item.note));
      }

      if (section.fieldsFrom === "operations") {
        const { pick, put, audit } = catalog.operations;
        add(pick.binStructure.label);
        for (const group of pick.groups) {
          for (const field of group.fields) add(field.label, field.description);
        }
        for (const category of put.categories) add(`Put flow: ${category.label}`);
        for (const field of audit.fields) add(field.label, field.description);
      }
    }
  }
  return entries;
}

/**
 * Finds settings by name, for the overview's search box. Every word of the query must appear in
 * a setting's label, help text or section name. Settings whose label starts with the query come
 * first, then those whose label contains it, then the rest. A setting that appears for each
 * station is listed once.
 *
 * @param catalog - The config catalog.
 * @param query - What the user typed.
 * @param limit - The most results to return.
 */
export function searchSettings(catalog: ConfigCatalog, query: string, limit = 8): SearchHit[] {
  const text = query.trim().toLowerCase();
  if (!text) return [];
  const words = text.split(/\s+/);

  const seen = new Set<string>();
  const hits: Array<{ hit: SearchHit; rank: number }> = [];
  for (const hit of indexCatalog(catalog)) {
    const label = hit.label.toLowerCase();
    const haystack = `${label} ${hit.hint?.toLowerCase() ?? ""} ${hit.section.toLowerCase()}`;
    const key = `${hit.module}|${label}`;
    if (seen.has(key) || !words.every((word) => haystack.includes(word))) continue;
    seen.add(key);
    hits.push({ hit, rank: label.startsWith(text) ? 0 : label.includes(text) ? 1 : 2 });
  }
  return hits
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ hit }) => hit);
}
