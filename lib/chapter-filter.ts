export function normalizeTopics(value: string | string[] | undefined): string[] {
  return Array.from(new Set((Array.isArray(value) ? value : value ? [value] : []).filter(v => v.trim().length > 0)));
}

export function appendFilterParams(params: URLSearchParams, values: Record<string, string | string[] | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach(item => { if (item) params.append(key, item); });
    else if (value) params.set(key, value);
  }
}
