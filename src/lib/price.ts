// null = unknown/blank; undefined = invalid entry. Zero is a valid price.
export function parseUnitPrice(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return undefined;

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value > 999999999.99) return undefined;
  return value;
}

export function formatUnitPrice(price: number): string {
  return `CA$${price.toFixed(2)}`;
}
