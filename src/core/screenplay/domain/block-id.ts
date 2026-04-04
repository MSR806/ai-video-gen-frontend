export function createScreenplayBlockId(): string {
  return `blk_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}
