export interface ScenarioConfigLocation {
  bucket?: string;
  prefix?: string;
}

export interface ScenarioConfigObject {
  bucket: string;
  object: string;
}

/**
 * Parses a `gs://<bucket>/<object>` URI and returns it only when it lies inside the allowed bucket and
 * prefix; `null` otherwise. Dot segments, empty segments, queries, fragments and escapes are rejected
 * so the prefix cannot be escaped.
 */
export function parseScenarioConfigUri(uri: string, allowed: ScenarioConfigLocation): ScenarioConfigObject | null {
  if (!allowed.bucket || !uri.startsWith('gs://') || /[?#%\\]/.test(uri)) return null;

  const [bucket, ...segments] = uri.slice('gs://'.length).split('/');
  if (bucket !== allowed.bucket || segments.length === 0) return null;
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return null;

  const object = segments.join('/');
  const prefix = allowed.prefix ? allowed.prefix.replace(/\/*$/, '/') : '';
  return object.startsWith(prefix) ? { bucket, object } : null;
}
