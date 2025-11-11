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
  hasPromotion: boolean;
}

export interface StoreComparison {
  store: "Walmart" | "Metro" | "Super C";
  totalPrice: number;
  savings: number;
  savingsPercentage: number;
  productsFound: number;
  cheaperItems: number;
  promotionsFound: number;
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
  promotionsFoundWalmart: number;
  promotionsFoundMetro: number;
  promotionsFoundSuperC: number;
}

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
  PRECISION: 100, // 2 décimales
  TAX_RATE: 0.14975, // TPS + TVQ Québec
  MIN_VALID_PRICE: 0.01,
  MAX_VALID_PRICE: 1000,
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
// DÉTERMINATION DU MEILLEUR MAGASIN
// ========================================
/**
 * Détermine le magasin avec le meilleur prix total
 */
export function determineBestStore(
  walmartTotal: number,
  metroTotal: number,
  supercTotal: number
): "Walmart" | "Metro" | "Super C" | "Égalité" {
  const tolerance = 0.01; // Tolérance stricte pour les prix égaux
  const walmart = round(walmartTotal);
  const metro = round(metroTotal);
  const superc = round(supercTotal);

  // Vérifie si les totaux sont égaux (à la tolérance près)
  const allTotalsEqual =
    Math.abs(walmart - metro) < tolerance &&
    Math.abs(walmart - superc) < tolerance &&
    Math.abs(metro - superc) < tolerance;

  if (allTotalsEqual) {
    return "Égalité"; // Retourne "Égalité" si les totaux sont égaux
  }

  // Sinon, retourne le magasin avec le total minimal
  const minTotal = Math.min(walmart, metro, superc);
  if (Math.abs(walmart - minTotal) < tolerance) return "Walmart";
  if (Math.abs(metro - minTotal) < tolerance) return "Metro";
  if (Math.abs(superc - minTotal) < tolerance) return "Super C";

  return "Égalité"; // Fallback
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
    walmartOldPrice?: number | null; // Prix régulier pour détecter les promos
    metroOldPrice?: number | null;
    supercOldPrice?: number | null;
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
  let promotionsFoundWalmart = 0;
  let promotionsFoundMetro = 0;
  let promotionsFoundSuperC = 0;
  const storeCheaperCount = {
    Walmart: 0,
    Metro: 0,
    "Super C": 0,
  };

  // Traiter chaque produit
  for (const product of products) {
    const {
      name,
      walmartPrice,
      metroPrice,
      supercPrice,
      walmartOldPrice,
      metroOldPrice,
      supercOldPrice,
    } = product;

    // Compter les produits trouvés par magasin
    if (isValidPrice(walmartPrice)) productsFoundWalmart++;
    if (isValidPrice(metroPrice)) productsFoundMetro++;
    if (isValidPrice(supercPrice)) productsFoundSuperC++;

    // Compter les promos (si oldPrice existe et est > newPrice)
    if (isValidPrice(walmartOldPrice) && isValidPrice(walmartPrice) && walmartOldPrice > walmartPrice) {
      promotionsFoundWalmart++;
    }
    if (isValidPrice(metroOldPrice) && isValidPrice(metroPrice) && metroOldPrice > metroPrice) {
      promotionsFoundMetro++;
    }
    if (isValidPrice(supercOldPrice) && isValidPrice(supercPrice) && supercOldPrice > supercPrice) {
      promotionsFoundSuperC++;
    }

    // Calculer les économies
    const savings = calculateSavings(walmartPrice, metroPrice, supercPrice);

    // Trouver le meilleur prix
    const validPrices = [
      { store: "Walmart" as const, price: walmartPrice },
      { store: "Metro" as const, price: metroPrice },
      { store: "Super C" as const, price: supercPrice },
    ].filter((p) => isValidPrice(p.price)) as Array<{
      store: "Walmart" | "Metro" | "Super C";
      price: number;
    }>;

    let bestStore: "Walmart" | "Metro" | "Super C" | null = null;
    let bestPrice: number | null = null;
    let hasPromotion = false;

    if (validPrices.length > 0) {
      validPrices.sort((a, b) => a.price - b.price);
      bestStore = validPrices[0].store;
      bestPrice = validPrices[0].price;
      hasPromotion =
        (bestStore === "Walmart" && walmartOldPrice && walmartOldPrice > walmartPrice) ||
        (bestStore === "Metro" && metroOldPrice && metroOldPrice > metroPrice) ||
        (bestStore === "Super C" && supercOldPrice && supercOldPrice > supercPrice);

      if (savings > 0) {
        storeCheaperCount[bestStore]++;
      }
    }

    // Un produit est trouvé s'il a au moins un prix valide
    const isFound = isValidPrice(walmartPrice) || isValidPrice(metroPrice) || isValidPrice(supercPrice);
    if (isFound) productsFound++;

    // Accumuler les totaux
    if (isValidPrice(walmartPrice)) walmartTotal += walmartPrice;
    if (isValidPrice(metroPrice)) metroTotal += metroPrice;
    if (isValidPrice(supercPrice)) supercTotal += supercPrice;

    // Calculer le pourcentage d'économie
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices.map((p) => p.price)) : 0;
    const savingsPercentage = calculateSavingsPercentage(savings, maxPrice);

    // Calculer la confiance
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
      confidence,
      hasPromotion,
    });

    // Log du résultat
    if (bestStore) {
      const promoLog = hasPromotion ? " (PROMO)" : "";
      console.log(`   ✅ "${name}": ${bestStore} - $${bestPrice?.toFixed(2)}${promoLog}`);
    } else {
      console.log(`   ❌ "${name}": Non trouvé`);
    }
  }

  // Calculer le résumé
  const bestStore = determineBestStore(walmartTotal, metroTotal, supercTotal);

  const totals = [walmartTotal, metroTotal, supercTotal].filter((t) => t > 0);
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
    productsFoundSuperC,
    promotionsFoundWalmart,
    promotionsFoundMetro,
    promotionsFoundSuperC,
  };

  console.log(`\n📊 === RÉSUMÉ ===`);
  console.log(`   🏪 Walmart: $${summary.totalWalmart.toFixed(2)} (${productsFoundWalmart} produits, ${promotionsFoundWalmart} promos)`);
  console.log(`   🏪 Metro: $${summary.totalMetro.toFixed(2)} (${productsFoundMetro} produits, ${promotionsFoundMetro} promos)`);
  console.log(`   🏪 Super C: $${summary.totalSuperC.toFixed(2)} (${productsFoundSuperC} produits, ${promotionsFoundSuperC} promos)`);
  console.log(`   🏆 Meilleur: ${bestStore}`);
  console.log(`   💰 Économie: $${summary.totalSavings.toFixed(2)} (${savingsPercentage.toFixed(1)}%)`);

  return { comparisons, summary };
}

// ========================================
// FORMATAGE ET UTILITAIRES
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

  static set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    if (this.cache.size >= this.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  static get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

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

  static clear(): void {
    this.cache.clear();
  }

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
