export function constituentNameKey(name: string): string {
  return name.trim().toUpperCase();
}

export function indexConstituentNames(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((name) => {
    const key = constituentNameKey(name);
    if (!key || key.startsWith('NSE_INDEX|') || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function untrackedConstituents(constituents: string[], trackedNames: string[]): string[] {
  const tracked = new Set(trackedNames.map(constituentNameKey));
  return constituents.filter((name) => !tracked.has(constituentNameKey(name)));
}
