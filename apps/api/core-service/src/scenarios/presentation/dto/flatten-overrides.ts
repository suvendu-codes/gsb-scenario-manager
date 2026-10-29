
type Plain = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Plain =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value);

const isStationKeyed = (node: Plain): boolean =>
  isPlainObject(node.defaults) &&
  'schedule' in node.defaults;

function flattenInto(
  obj: Plain,
  prefix: string,
  emit: (path: string, value: unknown) => void,
): void {
  const stack: Array<{ obj: Plain; prefix: string }> = [
    { obj, prefix },
  ];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = Object.entries(current.obj);

    // Reverse insertion order because the stack is LIFO.
    for (let i = entries.length - 1; i >= 0; i--) {
      const [key, value] = entries[i];
      const path = current.prefix
        ? `${current.prefix}.${key}`
        : key;

      if (isPlainObject(value)) {
        stack.push({ obj: value, prefix: path });
      } else {
        emit(path, value);
      }
    }
  }
}

/**
 * Flattens nested objects into dot-notation keys.
 * Arrays and primitives are leaves.
 */
export function flattenObj(
  obj: Plain,
  parentKey = '',
  result: Plain = {},
): Plain {
  flattenInto(obj, parentKey, (path, value) => {
    result[path] = value;
  });

  return result;
}

/**
 * Flattens only overrides while preserving other nesting.
 */
export function flattenOverrides(node: unknown): unknown {
  if (!isPlainObject(node)) return node;

  const out: Plain = {};
  const stationKeyed = isStationKeyed(node);

  for (const [key, value] of Object.entries(node)) {
    if (key === 'overrides' && Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (isPlainObject(entry)) {
          flattenInto(entry, `${key}.${index}`, (path, leaf) => {
            out[path] = leaf;
          });
        }
      });
    } else if (key === 'overrides' && isPlainObject(value)) {
      if (stationKeyed) {
        flattenInto(value, key, (path, leaf) => {
          out[path] = leaf;
        });
      } else {
        let index = 0;

        flattenInto(value, '', (path, leaf) => {
          out[`${key}.${index++}.${path}`] = leaf;
        });
      }
    } else {
      out[key] = flattenOverrides(value);
    }
  }

  return out;
}
