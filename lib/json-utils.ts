export function jsonToRecord(val: unknown): Record<string, string> {
  if (typeof val === 'object' && val !== null) {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      result[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return result;
  }
  return {};
}
