// lib/priceCalculator.ts - VERSION FINALE AVEC SUPER C

export interface PriceComparison {
  product: string;
  igaPrice: number | null;
  metroPrice: number | null;
  supercPrice: number | null;  // 🔥 AJOUTÉ
  bestPrice: number | null;
  bestStore: "IGA" | "Metro" | "Super C" | null;  // 🔥 MODIFIÉ
  savings: number;
  savingsPercentage: number;
  unit: string;
  confidence: number;
  unitPrice?: {
    iga: number | null;
    metro: number | null;
    superc: number | null;  // 🔥 AJOUTÉ
  };
}

export interface StoreComparison {
  store: "IGA" | "Metro" | "Super C";  // 🔥 MODIFIÉ
  savings: number;
  savingsPercentage: number;
  totalItems: number;
  cheaperItems: number;
}

/**
 * Calculateur de prix optimisé avec précision au cent
 */
export class PriceCalculator {
  private static readonly PRECISION = 100; // 2 décimales
  private static readonly TAX_RATE = 0.14975; // TPS + TVQ Québec

  /**
   * Arrondir avec précision garantie
   */
  private static round(value: number): number {
    return Math.round(value * this.PRECISION) / this.PRECISION;
  }

  /**
   * Calcul total optimisé avec validation
   */
  static calculateTotal(prices: (number | null)[]): number {
    if (!prices || prices.length === 0) return 0;
    
    const sum = prices.reduce((acc, price) => {
      if (price !== null && price > 0 && isFinite(price)) {
        return acc + price;
      }
      return acc;
    }, 0);
    
    return this.round(sum);
  }

  /**
   * 🔥 NOUVEAU: Calcul des économies pour 3+ magasins
   */
  static calculateSavingsMultiStore(...prices: (number | null)[]): number {
    const validPrices = prices.filter(this.isValidPrice);
    if (validPrices.length < 2) return 0;
    
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    
    return this.round(max - min);
  }

  /**
   * Calcul des économies avec validation (2 magasins - rétrocompatible)
   */
  static calculateSavings(igaPrice: number | null, metroPrice: number | null): number {
    if (!this.isValidPrice(igaPrice) || !this.isValidPrice(metroPrice)) {
      return 0;
    }
    
    return this.round(Math.abs(igaPrice! - metroPrice!));
  }

  /**
   * Calcul du pourcentage d'économie précis
   */
  static calculateSavingsPercentage(savings: number, basePrice: number): number {
    if (basePrice <= 0 || savings <= 0) return 0;
    return this.round((savings / basePrice) * 100);
  }

  /**
   * 🔥 NOUVEAU: Déterminer le meilleur magasin parmi 3+
   */
  static determineBestStoreMulti(
    storeTotals: Array<{ store: "IGA" | "Metro" | "Super C"; total: number }>,
    itemCount: number = 0
  ): StoreComparison {
    const validStores = storeTotals.filter(s => s.total > 0);
    
    if (validStores.length === 0) {
      return {
        store: "IGA",
        savings: 0,
        savingsPercentage: 0,
        totalItems: itemCount,
        cheaperItems: 0
      };
    }

    validStores.sort((a, b) => a.total - b.total);
    
    const bestStore = validStores[0];
    const worstStore = validStores[validStores.length - 1];
    const savings = this.round(worstStore.total - bestStore.total);
    
    return {
      store: bestStore.store,
      savings,
      savingsPercentage: this.calculateSavingsPercentage(savings, worstStore.total),
      totalItems: itemCount,
      cheaperItems: 0
    };
  }

  /**
   * Déterminer le meilleur magasin (2 magasins - rétrocompatible)
   */
  static determineBestStore(
    igaTotal: number,
    metroTotal: number,
    itemCount: number = 0
  ): StoreComparison {
    const igaTotalRounded = this.round(igaTotal);
    const metroTotalRounded = this.round(metroTotal);
    
    if (igaTotalRounded < metroTotalRounded) {
      const savings = this.round(metroTotalRounded - igaTotalRounded);
      return {
        store: "IGA",
        savings,
        savingsPercentage: this.calculateSavingsPercentage(savings, metroTotalRounded),
        totalItems: itemCount,
        cheaperItems: 0
      };
    } else if (metroTotalRounded < igaTotalRounded) {
      const savings = this.round(igaTotalRounded - metroTotalRounded);
      return {
        store: "Metro",
        savings,
        savingsPercentage: this.calculateSavingsPercentage(savings, igaTotalRounded),
        totalItems: itemCount,
        cheaperItems: 0
      };
    }
    
    return {
      store: "IGA",
      savings: 0,
      savingsPercentage: 0,
      totalItems: itemCount,
      cheaperItems: 0
    };
  }

  /**
   * 🔥 NOUVEAU: Comparaison détaillée avec 3 magasins
   */
  static compareProductsMultiStore(
    products: Array<{ 
      name: string; 
      igaPrice: number | null; 
      metroPrice: number | null; 
      supercPrice: number | null;
      unit?: string 
    }>
  ): {
    comparisons: PriceComparison[];
    igaTotal: number;
    metroTotal: number;
    supercTotal: number;
    bestStore: StoreComparison;
  } {
    const comparisons: PriceComparison[] = [];
    let igaTotal = 0;
    let metroTotal = 0;
    let supercTotal = 0;
    const storeCheaperCount = { IGA: 0, Metro: 0, "Super C": 0 };

    for (const product of products) {
      const { name, igaPrice, metroPrice, supercPrice, unit = "unité" } = product;
      
      const savings = this.calculateSavingsMultiStore(igaPrice, metroPrice, supercPrice);
      const bestPrice = this.getBestPriceMulti(igaPrice, metroPrice, supercPrice);
      const bestStore = this.getBestStoreForProductMulti(igaPrice, metroPrice, supercPrice);
      
      if (bestStore && savings > 0) {
        storeCheaperCount[bestStore]++;
      }
      
      if (this.isValidPrice(igaPrice)) igaTotal += igaPrice!;
      if (this.isValidPrice(metroPrice)) metroTotal += metroPrice!;
      if (this.isValidPrice(supercPrice)) supercTotal += supercPrice!;
      
      const allPrices = [igaPrice, metroPrice, supercPrice].filter(this.isValidPrice);
      const higherPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
      const savingsPercentage = this.calculateSavingsPercentage(savings, higherPrice);
      
      comparisons.push({
        product: name,
        igaPrice,
        metroPrice,
        supercPrice,
        bestPrice,
        bestStore,
        savings,
        savingsPercentage,
        unit,
        confidence: this.calculateConfidenceMulti(igaPrice, metroPrice, supercPrice)
      });
    }

    const bestStoreResult = this.determineBestStoreMulti([
      { store: "IGA", total: igaTotal },
      { store: "Metro", total: metroTotal },
      { store: "Super C", total: supercTotal }
    ], products.length);
    
    bestStoreResult.cheaperItems = storeCheaperCount[bestStoreResult.store];

    return {
      comparisons,
      igaTotal: this.round(igaTotal),
      metroTotal: this.round(metroTotal),
      supercTotal: this.round(supercTotal),
      bestStore: bestStoreResult
    };
  }

  /**
   * Comparaison détaillée (2 magasins - rétrocompatible)
   */
  static compareProducts(
    products: Array<{ name: string; igaPrice: number | null; metroPrice: number | null; unit?: string }>
  ): {
    comparisons: PriceComparison[];
    igaTotal: number;
    metroTotal: number;
    bestStore: StoreComparison;
  } {
    const comparisons: PriceComparison[] = [];
    let igaTotal = 0;
    let metroTotal = 0;
    let igaCheaperCount = 0;
    let metroCheaperCount = 0;

    for (const product of products) {
      const { name, igaPrice, metroPrice, unit = "unité" } = product;
      
      const savings = this.calculateSavings(igaPrice, metroPrice);
      const bestPrice = this.getBestPrice(igaPrice, metroPrice);
      const bestStore = this.getBestStoreForProduct(igaPrice, metroPrice);
      
      if (bestStore === "IGA" && savings > 0) igaCheaperCount++;
      if (bestStore === "Metro" && savings > 0) metroCheaperCount++;
      
      if (this.isValidPrice(igaPrice)) igaTotal += igaPrice!;
      if (this.isValidPrice(metroPrice)) metroTotal += metroPrice!;
      
      const higherPrice = Math.max(igaPrice || 0, metroPrice || 0);
      const savingsPercentage = this.calculateSavingsPercentage(savings, higherPrice);
      
      comparisons.push({
        product: name,
        igaPrice,
        metroPrice,
        supercPrice: null,  // 🔥 AJOUTÉ pour compatibilité
        bestPrice,
        bestStore,
        savings,
        savingsPercentage,
        unit,
        confidence: this.calculateConfidence(igaPrice, metroPrice)
      });
    }

    const bestStoreResult = this.determineBestStore(igaTotal, metroTotal, products.length);
    bestStoreResult.cheaperItems = bestStoreResult.store === "IGA" ? igaCheaperCount : metroCheaperCount;

    return {
      comparisons,
      igaTotal: this.round(igaTotal),
      metroTotal: this.round(metroTotal),
      bestStore: bestStoreResult
    };
  }

  /**
   * 🔥 NOUVEAU: Obtenir le meilleur prix parmi 3 magasins
   */
  private static getBestPriceMulti(
    igaPrice: number | null, 
    metroPrice: number | null,
    supercPrice: number | null
  ): number | null {
    const prices = [igaPrice, metroPrice, supercPrice].filter(this.isValidPrice);
    return prices.length > 0 ? Math.min(...prices) : null;
  }

  /**
   * 🔥 NOUVEAU: Obtenir le meilleur magasin parmi 3
   */
  private static getBestStoreForProductMulti(
    igaPrice: number | null,
    metroPrice: number | null,
    supercPrice: number | null
  ): "IGA" | "Metro" | "Super C" | null {
    const stores = [
      { name: "IGA" as const, price: igaPrice },
      { name: "Metro" as const, price: metroPrice },
      { name: "Super C" as const, price: supercPrice }
    ].filter(s => this.isValidPrice(s.price));

    if (stores.length === 0) return null;

    stores.sort((a, b) => a.price! - b.price!);
    return stores[0].name;
  }

  private static getBestPrice(igaPrice: number | null, metroPrice: number | null): number | null {
    if (!this.isValidPrice(igaPrice) && !this.isValidPrice(metroPrice)) return null;
    if (!this.isValidPrice(igaPrice)) return metroPrice;
    if (!this.isValidPrice(metroPrice)) return igaPrice;
    return Math.min(igaPrice!, metroPrice!);
  }

  private static getBestStoreForProduct(
    igaPrice: number | null,
    metroPrice: number | null
  ): "IGA" | "Metro" | null {
    if (!this.isValidPrice(igaPrice) && !this.isValidPrice(metroPrice)) return null;
    if (!this.isValidPrice(igaPrice)) return "Metro";
    if (!this.isValidPrice(metroPrice)) return "IGA";
    return igaPrice! <= metroPrice! ? "IGA" : "Metro";
  }

  /**
   * 🔥 NOUVEAU: Calculer la confiance pour 3 magasins
   */
  private static calculateConfidenceMulti(
    igaPrice: number | null,
    metroPrice: number | null,
    supercPrice: number | null
  ): number {
    const validCount = [igaPrice, metroPrice, supercPrice].filter(this.isValidPrice).length;
    
    if (validCount === 3) return 100;
    if (validCount === 2) return 75;
    if (validCount === 1) return 50;
    return 0;
  }

  private static calculateConfidence(igaPrice: number | null, metroPrice: number | null): number {
    if (this.isValidPrice(igaPrice) && this.isValidPrice(metroPrice)) return 100;
    if (this.isValidPrice(igaPrice) || this.isValidPrice(metroPrice)) return 50;
    return 0;
  }

  private static isValidPrice(price: number | null | undefined): price is number {
    return price !== null && price !== undefined && price > 0 && isFinite(price);
  }

  static isDataFresh(lastUpdated: string | Date, maxAgeHours: number = 24): boolean {
    try {
      const lastUpdate = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
      const ageMs = Date.now() - lastUpdate.getTime();
      return ageMs < maxAgeHours * 3600000;
    } catch {
      return false;
    }
  }

  static formatPrice(price: number | null, withSymbol: boolean = true): string {
    if (!this.isValidPrice(price)) return "N/A";
    const formatted = price!.toFixed(2);
    return withSymbol ? `$${formatted}` : formatted;
  }

  static calculateUnitPrice(price: number, quantity: number, unit: string): string {
    if (!this.isValidPrice(price) || quantity <= 0) return "N/A";
    const unitPrice = this.round(price / quantity);
    return `${this.formatPrice(unitPrice)}/${unit}`;
  }

  static applyTax(amount: number, includeTax: boolean = true): number {
    if (!includeTax || !this.isValidPrice(amount)) return amount;
    return this.round(amount * (1 + this.TAX_RATE));
  }

  static calculateAnnualSavings(weeklySavings: number, weeks: number = 52): number {
    if (!this.isValidPrice(weeklySavings)) return 0;
    return this.round(weeklySavings * weeks);
  }
}

/**
 * Gestionnaire de cache optimisé avec LRU et opérations BATCH
 */
export class PriceCache {
  private static cache = new Map<string, CacheEntry>();
  private static accessOrder: string[] = [];
  private static readonly MAX_SIZE = 1000;
  private static readonly DEFAULT_TTL = 1800000; // 30 minutes
  private static cleanupInterval: any = null;

  static initialize(): void {
    if (this.cleanupInterval === null && typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
    }
  }

  static set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0
    });

    this.updateAccessOrder(key);
  }

  static get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }
    
    entry.hits++;
    this.updateAccessOrder(key);
    
    return entry.data;
  }

  static getOrSet(key: string, factory: () => any, ttl?: number): any {
    const cached = this.get(key);
    if (cached !== null) return cached;
    
    const value = factory();
    this.set(key, value, ttl);
    return value;
  }

  static batchGet(keys: string[]): Map<string, any> {
    const results = new Map<string, any>();
    const now = Date.now();
    
    for (const key of keys) {
      const entry = this.cache.get(key);
      
      if (entry && (now - entry.timestamp <= entry.ttl)) {
        entry.hits++;
        this.updateAccessOrder(key);
        results.set(key, entry.data);
      } else if (entry) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
      }
    }
    
    return results;
  }

  static batchSet(entries: Array<{ key: string; data: any; ttl?: number }>): number {
    let setCount = 0;
    
    for (const entry of entries) {
      try {
        this.set(entry.key, entry.data, entry.ttl);
        setCount++;
      } catch (error) {
        console.error(`❌ Erreur batch set pour clé "${entry.key}":`, error);
      }
    }
    
    return setCount;
  }

  static batchInvalidate(keys: string[]): number {
    let invalidated = 0;
    
    for (const key of keys) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }

  static has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }
    
    return true;
  }

  static invalidate(key: string): void {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  static cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} entrées de cache nettoyées`);
    }
    
    return cleaned;
  }

  static invalidatePattern(pattern: string | RegExp): number {
    let invalidated = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }

  static getStats(): CacheStats {
    let totalHits = 0;
    let oldestEntry = Date.now();
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
    }
    
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      totalHits,
      avgHitsPerEntry: this.cache.size > 0 ? Math.round(totalHits / this.cache.size * 100) / 100 : 0,
      oldestEntryAge: Date.now() - oldestEntry
    };
  }

  static clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    console.log('🗑️ Cache vidé complètement');
  }

  private static updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private static removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  static destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

/**
 * Utilitaires de prix avancés
 */
export class PriceUtils {
  static compareDetailed(price1: number, price2: number): PriceComparisonDetail {
    const diff = PriceCalculator['round'](price2 - price1);
    const absDiff = Math.abs(diff);
    const percentage = price1 > 0 ? PriceCalculator['round']((absDiff / price1) * 100) : 0;
    
    return {
      difference: diff,
      absoluteDifference: absDiff,
      percentage,
      cheaper: diff > 0 ? 1 : diff < 0 ? 2 : null,
      significantDifference: absDiff >= 0.25
    };
  }

  static analyzePriceHistory(prices: number[]): PriceAnalysis {
    if (prices.length === 0) {
      return { min: 0, max: 0, avg: 0, volatility: 0, trend: 'stable' };
    }

    const validPrices = prices.filter(p => p > 0);
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    const avg = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    
    const variance = validPrices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / validPrices.length;
    const stdDev = Math.sqrt(variance);
    const volatility = avg > 0 ? PriceCalculator['round']((stdDev / avg) * 100) : 0;
    
    const trend = validPrices.length > 1
      ? validPrices[validPrices.length - 1] > validPrices[0] ? 'rising' : 
        validPrices[validPrices.length - 1] < validPrices[0] ? 'falling' : 'stable'
      : 'stable';

    return {
      min: PriceCalculator['round'](min),
      max: PriceCalculator['round'](max),
      avg: PriceCalculator['round'](avg),
      volatility,
      trend
    };
  }

  static calculateUnitPrice(price: number, quantity: number, unit: string): string {
    if (quantity <= 0) return "N/A";
    const unitPrice = PriceCalculator['round'](price / quantity);
    return `$${unitPrice.toFixed(2)}/${unit}`;
  }

  static comparePrices(price1: number, price2: number): {
    difference: number;
    percentage: number;
    cheaper: 1 | 2 | null;
  } {
    if (price1 === price2) {
      return { difference: 0, percentage: 0, cheaper: null };
    }

    const difference = Math.abs(price1 - price2);
    const percentage = (difference / Math.max(price1, price2)) * 100;

    return {
      difference: PriceCalculator['round'](difference),
      percentage: PriceCalculator['round'](percentage),
      cheaper: price1 < price2 ? 1 : 2
    };
  }

  static calculateAnnualSavings(weeklySavings: number): number {
    return PriceCalculator['round'](weeklySavings * 52);
  }

  static roundToNearestCent(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  static applyTax(amount: number, taxRate: number = 0.14975): number {
    return this.roundToNearestCent(amount * (1 + taxRate));
  }
}

// Types additionnels
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  totalHits: number;
  avgHitsPerEntry: number;
  oldestEntryAge: number;
}

interface PriceComparisonDetail {
  difference: number;
  absoluteDifference: number;
  percentage: number;
  cheaper: 1 | 2 | null;
  significantDifference: boolean;
}

interface PriceAnalysis {
  min: number;
  max: number;
  avg: number;
  volatility: number;
  trend: 'rising' | 'falling' | 'stable';
}

// Initialiser le cache au chargement
if (typeof window !== 'undefined') {
  PriceCache.initialize();
}