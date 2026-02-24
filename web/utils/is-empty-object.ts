export function isEmptyObject(value: unknown): value is Record<string, never> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.keys(value as Record<string, unknown>).length === 0 &&
    (value as { constructor?: unknown }).constructor === Object
  );
}
