const processed = new Set<string>();

export function makeKey(parts: { eventId: string; timestampIso: string; action: string }): string {
  return `${parts.eventId}:${parts.timestampIso}:${parts.action}`;
}

export function has(key: string): boolean {
  return processed.has(key);
}

export function add(key: string): void {
  processed.add(key);
}

export function clear(): void {
  processed.clear();
}

export default { makeKey, has, add, clear };

