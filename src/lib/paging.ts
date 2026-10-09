export const PAGE_SIZE = 10;

export function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return page >= 1 ? page : 1;
}
