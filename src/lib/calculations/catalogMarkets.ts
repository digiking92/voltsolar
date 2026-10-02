/**
 * Equipment market packs — filter which brand SKUs are offered for matching.
 * Physics sizing stays global; this only affects catalog recommendations.
 */

export type CatalogMarketId =
  | 'global'
  | 'west_africa'
  | 'europe'
  | 'americas'
  | 'asia_pacific';

export interface CatalogMarketOption {
  id: CatalogMarketId;
  title: string;
  desc: string;
}

export const CATALOG_MARKETS: CatalogMarketOption[] = [
  {
    id: 'global',
    title: 'Global (all brands)',
    desc: 'Full built-in catalog — best default for worldwide quotes.'
  },
  {
    id: 'west_africa',
    title: 'West Africa',
    desc: 'MUST, Growatt SPF, Felicity, SRNE, Deye, Luxpower — common AIO stock.'
  },
  {
    id: 'europe',
    title: 'Europe',
    desc: 'Victron, SMA, Solis, GoodWe, Deye — hybrid / off-grid focus.'
  },
  {
    id: 'americas',
    title: 'Americas',
    desc: 'Sol-Ark, EG4, Growatt, Victron, Deye — NA / LatAm hybrids.'
  },
  {
    id: 'asia_pacific',
    title: 'Asia Pacific',
    desc: 'Growatt, GoodWe, Solis, Deye, Luxpower — APAC hybrids.'
  }
];

export function resolveCatalogMarket(value: unknown): CatalogMarketId {
  if (
    value === 'west_africa' ||
    value === 'europe' ||
    value === 'americas' ||
    value === 'asia_pacific' ||
    value === 'global'
  ) {
    return value;
  }
  return 'global';
}

/** Region tags on a SKU — omit / empty means available in every market. */
export function inverterInMarket(
  regions: CatalogMarketId[] | undefined | null,
  market: CatalogMarketId
): boolean {
  if (market === 'global') return true;
  if (!regions || regions.length === 0) return true;
  return regions.includes(market) || regions.includes('global');
}
