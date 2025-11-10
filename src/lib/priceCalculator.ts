// lib/priceCalculator.ts
/**
 * Service de calcul et comparaison de prix
 * Supporte 3 magasins: Walmart, Metro, Super C
 */

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface PriceComparison {
  product: string;
  walmartPrice: number | null;
  metroPrice: number | null;
  supercPrice: number | null;
  bestPrice: number | null;
  bestStore: "Walmart" | "Metro" | "Super C" | null;
  savings: number;
  savingsPercentage: number;
  confidence: number;
}

export interface StoreComparison {
  store: "Walmart" | "Metro" | "Super C";
  totalPrice: number;
  savings: number;
  savingsPercentage: number;
  productsFound: number;
  cheaperItems: number;
}

export interface ComparisonSummary {
  totalWalmart: number;
  totalMetro: number;
  totalSuperC: number;
  bestStore: "Walmart" | "Metro" | "Super C" | "Égalité";
  totalSavings: number;
  savingsPercentage: number;
  productsFound: number;
  totalProducts: number;
  productsFoundWalmart: number;
  productsFoundMetro: number;
  productsFoundSuperC: number;
}

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  PRECISION: 100, // 2 décimales
  TAX_RATE: 0.14975, // TPS + TVQ Québec
  MIN_VALID_PRICE: 0.01,
  MAX_VALID_PRICE: 1000
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Arrondit un nombre avec précision garantie
 */
function round(value: number): number {
  return Math.round(value * CONFIG.PRECISION) / CONFIG.PRECISION;
}

/**
 * Vérifie si un prix est valide
 */
function isValidPrice(price: number | null | undefined): price is number {
  return (
    price !== null &&
    price !== undefined &&
    price >= CONFIG.MIN_VALID_PRICE &&
    price <= CONFIG.MAX_VALID_PRICE &&
    isFinite(price)
  );
}

// ========================================
// CALCULS DE BASE
// ========================================

/**
 * Calcule le total d'une liste de prix
 */
export function calculateTotal(prices: (number | null)[]): number {
  if (!prices || prices.length === 0) return 0;

  const sum = prices.reduce((acc, price) => {
    if (isValidPrice(price)) {
      return acc + price;
    }
    return acc;
  }, 0);

  return round(sum);
}

/**
 * Calcule les économies entre plusieurs prix
 */
export function calculateSavings(...prices: (number | null)[]): number {
  const validPrices = prices.filter(isValidPrice);
  if (validPrices.length < 2) return 0;

  const min = Math.min(...validPrices);
  const max = Math.max(...validPrices);

  return round(max - min);
}

/**
 * Calcule le pourcentage d'économie
 */
export function calculateSavingsPercentage(savings: number, basePrice: number): number {
  if (basePrice <= 0 || savings <= 0) return 0;
  return round((savings / basePrice) * 100);
}

// ========================================
// DÉTERMIN ATION DU MEILLEUR MAGASIN
// ========================================

/**
 * Détermine le magasin avec le meilleur prix total
 */
export function determineBestStore(
  walmartTotal: number,
  metroTotal: number,
  supercTotal: number
): "Walmart" | "Metro" | "Super C" | "Égalité" {
  // Arrondir les totaux
  const walmart = round(walmartTotal);
  const metro = round(metroTotal);
  const superc = round(supercTotal);

  // Trouver le minimum
  const minTotal = Math.min(walmart, metro, superc);

  // Vérifier l'égalité (tolérance de 0.01$)
  const tolerance = 0.01;
  const isEqual =
    Math.abs(walmart - metro) < tolerance &&
    Math.abs(walmart - superc) < tolerance &&
    Math.abs(metro - superc) < tolerance;

  if (isEqual) return "Égalité";

  // Retourner le magasin avec le prix minimum
  if (Math.abs(walmart - minTotal) < tolerance) return "Walmart";
  if (Math.abs(metro - minTotal) < tolerance) return "Metro";
  if (Math.abs(superc - minTotal) < tolerance) return "Super C";

  return "Walmart"; // Fallback
}

// ========================================
// COMPARAISON DÉTAILLÉE
// ========================================

/**
 * Compare les prix de plusieurs produits entre les 3 magasins
 */
export function compareProducts(
  products: Array<{
    name: string;
    walmartPrice: number | null;
    metroPrice: number | null;
    supercPrice: number | null;
  }>
): {
  comparisons: PriceComparison[];
  summary: ComparisonSummary;
} {
  console.log(`\n💰 === COMPARAISON DES PRIX ===`);
  console.log(`   📦 Produits à comparer: ${products.length}`);

  const comparisons: PriceComparison[] = [];
  let walmartTotal = 0;
  let metroTotal = 0;
  let supercTotal = 0;
  let productsFound = 0;
  let productsFoundWalmart = 0;
  let productsFoundMetro = 0;
  let productsFoundSuperC = 0;

  const storeCheaperCount = {
    Walmart: 0,
    Metro: 0,
    "Super C": 0
  };

  // Traiter chaque produit
  for (const product of products) {
    const { name, walmartPrice, metroPrice, supercPrice } = product;

    // Calculer les économies
    const savings = calculateSavings(walmartPrice, metroPrice, supercPrice);

    // Trouver le meilleur prix
    const validPrices = [
      { store: "Walmart" as const, price: walmartPrice },
      { store: "Metro" as const, price: metroPrice },
      { store: "Super C" as const, price: supercPrice }
    ].filter(p => isValidPrice(p.price)) as Array<{
      store: "Walmart" | "Metro" | "Super C";
      price: number;
    }>;

    let bestStore: "Walmart" | "Metro" | "Super C" | null = null;
    let bestPrice: number | null = null;

    if (validPrices.length > 0) {
      validPrices.sort((a, b) => a.price - b.price);
      bestStore = validPrices[0].store;
      bestPrice = validPrices[0].price;

      if (savings > 0) {
        storeCheaperCount[bestStore]++;
      }

      productsFound++;
    }

    // Accumuler les totaux
    if (isValidPrice(walmartPrice)) {
      walmartTotal += walmartPrice;
      productsFoundWalmart++;
    }
    if (isValidPrice(metroPrice)) {
      metroTotal += metroPrice;
      productsFoundMetro++;
    }
    if (isValidPrice(supercPrice)) {
      supercTotal += supercPrice;
      productsFoundSuperC++;
    }

    // Calculer le pourcentage d'économie
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices.map(p => p.price)) : 0;
    const savingsPercentage = calculateSavingsPercentage(savings, maxPrice);

    // Calculer la confiance (pourcentage de magasins ayant le produit)
    const storesWithProduct = [walmartPrice, metroPrice, supercPrice].filter(isValidPrice).length;
    const confidence = Math.round((storesWithProduct / 3) * 100);

    comparisons.push({
      product: name,
      walmartPrice,
      metroPrice,
      supercPrice,
      bestPrice,
      bestStore,
      savings,
      savingsPercentage,
      confidence
    });

    // Log du résultat
    if (bestStore) {
      console.log(`   ✅ "${name}": ${bestStore} - $${bestPrice?.toFixed(2)}`);
    } else {
      console.log(`   ❌ "${name}": Non trouvé`);
    }
  }

  // Calculer le résumé
  const bestStore = determineBestStore(walmartTotal, metroTotal, supercTotal);
  const totals = [walmartTotal, metroTotal, supercTotal].filter(t => t > 0);
  const totalSavings = totals.length > 0 ? Math.max(...totals) - Math.min(...totals) : 0;
  const savingsPercentage = totals.length > 0 ? calculateSavingsPercentage(totalSavings, Math.max(...totals)) : 0;

  const summary: ComparisonSummary = {
    totalWalmart: round(walmartTotal),
    totalMetro: round(metroTotal),
    totalSuperC: round(supercTotal),
    bestStore,
    totalSavings: round(totalSavings),
    savingsPercentage,
    productsFound,
    totalProducts: products.length,
    productsFoundWalmart,
    productsFoundMetro,
    productsFoundSuperC
  };

  console.log(`\n📊 === RÉSUMÉ ===`);
  console.log(`   🏪 Walmart: $${summary.totalWalmart.toFixed(2)} (${productsFoundWalmart} produits)`);
  console.log(`   🏪 Metro: $${summary.totalMetro.toFixed(2)} (${productsFoundMetro} produits)`);
  console.log(`   🏪 Super C: $${summary.totalSuperC.toFixed(2)} (${productsFoundSuperC} produits)`);
  console.log(`   🏆 Meilleur: ${bestStore}`);
  console.log(`   💰 Économie: $${summary.totalSavings.toFixed(2)} (${savingsPercentage.toFixed(1)}%)`);

  return {
    comparisons,
    summary
  };
}

// ========================================
// FORMATAGE
// ========================================

/**
 * Formate un prix avec ou sans le symbole $
 */
export function formatPrice(price: number | null, withSymbol: boolean = true): string {
  if (!isValidPrice(price)) return "N/A";
  const formatted = price.toFixed(2);
  return withSymbol ? `$${formatted}` : formatted;
}

/**
 * Applique les taxes sur un montant
 */
export function applyTax(amount: number, includeTax: boolean = true): number {
  if (!includeTax || !isValidPrice(amount)) return amount;
  return round(amount * (1 + CONFIG.TAX_RATE));
}

/**
 * Calcule les économies annuelles basées sur les économies hebdomadaires
 */
export function calculateAnnualSavings(weeklySavings: number, weeks: number = 52): number {
  if (!isValidPrice(weeklySavings)) return 0;
  return round(weeklySavings * weeks);
}

// ========================================
// CACHE (OPTIONNEL)
// ========================================

export class PriceCache {
  private static cache = new Map<string, any>();
  private static readonly MAX_SIZE = 1000;
  private static readonly DEFAULT_TTL = 1800000; // 30 minutes

  /**
   * Stocke une valeur dans le cache
   */
  static set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    // Limiter la taille du cache
    if (this.cache.size >= this.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Récupère une valeur du cache
   */
  static get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Vérifier l'expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Récupère plusieurs valeurs du cache
   */
  static batchGet(keys: string[]): Map<string, any> {
    const results = new Map<string, any>();
    const now = Date.now();

    for (const key of keys) {
      const entry = this.cache.get(key);

      if (entry && now - entry.timestamp <= entry.ttl) {
        results.set(key, entry.data);
      } else if (entry) {
        this.cache.delete(key);
      }
    }

    return results;
  }

  /**
   * Vide le cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Vérifie si une clé existe dans le cache
   */
  static has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}