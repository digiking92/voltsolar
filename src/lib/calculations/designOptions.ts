import type { CatalogMarketId } from './catalogMarkets';
import type { DatasheetInverterInput } from './equipmentDatabase';

/** Optional inputs that keep runFullDesignCalculations backwards-compatible. */
export interface DesignCalculationOptions {
  /** Equipment market pack for brand matching. Default global. */
  catalogMarket?: CatalogMarketId;
  /** Manual peak sun hours (hrs/day). When set, skips city table. */
  peakSunHoursOverride?: number | null;
  /**
   * User datasheet inverter — when provided, used as a first-class candidate
   * so Voc/MPPT/protection use real limits (not generic planning placeholders).
   */
  customInverter?: DatasheetInverterInput | null;
  /** Prefer datasheet inverter over catalog when both pass. Default true if custom set. */
  preferCustomInverter?: boolean;
}
