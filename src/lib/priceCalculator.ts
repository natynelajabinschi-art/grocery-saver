// lib/priceCalculator.ts - VERSION CORRIGÉE

export interface PriceComparison {
  product: string;
  igaPrice: number | null;
  metroPrice: number | null;
  bestPrice: number | null;
  bestStore: "IGA" | "Metro" | null;
  savings: number;
  unit: string;
  confidence: number;
  quantity?: number; // Ajout pour gérer les quantités
}

export interface ComparisonSummary {
  totalIga: number;
  totalMetro: number;
  totalSavings: number;
  bestStore: "IGA" | "Metro" | "Égalité";
  productsFound: number;
  totalProducts: number;
  productsFoundIga: number;
  productsFoundMetro: number;
  priceDifference: number;
  savingsPercentage: number;
}

export class PriceCalculator {
  /**
   * Calcul précis du total avec gestion des doublons
   */
  static calculateTotal(comparisons: PriceComparison[]): { igaTotal: number; metroTotal: number } {
    let igaTotal = 0;
    let metroTotal = 0;

    comparisons.forEach(comparison => {
      // Additionner tous les prix valides (même les doublons)
      if (comparison.igaPrice !== null && comparison.igaPrice > 0) {
        igaTotal += comparison.igaPrice;
      }
      if (comparison.metroPrice !== null && comparison.metroPrice > 0) {
        metroTotal += comparison.metroPrice;
      }
    });

    return {
      igaTotal: Math.round(igaTotal * 100) / 100,
      metroTotal: Math.round(metroTotal * 100) / 100
    };
  }

  /**
   * Générer un résumé complet de la comparaison
   */
  static generateSummary(
    comparisons: PriceComparison[], 
    originalProducts: string[]
  ): ComparisonSummary {
    const totals = this.calculateTotal(comparisons);
    
    const productsFoundIga = comparisons.filter(c => c.igaPrice !== null && c.igaPrice > 0).length;
    const productsFoundMetro = comparisons.filter(c => c.metroPrice !== null && c.metroPrice > 0).length;
    const productsFound = Math.max(productsFoundIga, productsFoundMetro);
    
    const totalSavings = Math.abs(totals.igaTotal - totals.metroTotal);
    const priceDifference = totals.igaTotal - totals.metroTotal;
    
    let bestStore: "IGA" | "Metro" | "Égalité" = "Égalité";
    if (totals.igaTotal < totals.metroTotal) {
      bestStore = "IGA";
    } else if (totals.metroTotal < totals.igaTotal) {
      bestStore = "Metro";
    }

    const savingsPercentage = totals.igaTotal > 0 ? 
      (totalSavings / Math.max(totals.igaTotal, totals.metroTotal)) * 100 : 0;

    return {
      totalIga: totals.igaTotal,
      totalMetro: totals.metroTotal,
      totalSavings,
      bestStore,
      productsFound,
      totalProducts: originalProducts.length, // Utilise le nombre original de produits
      productsFoundIga,
      productsFoundMetro,
      priceDifference,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100
    };
  }

  /**
   * Calcul des économies par produit
   */
  static calculateProductSavings(comparison: PriceComparison): number {
    if (comparison.igaPrice === null || comparison.metroPrice === null) {
      return 0;
    }
    return Math.round(Math.abs(comparison.igaPrice - comparison.metroPrice) * 100) / 100;
  }

  /**
   * Déterminer le meilleur magasin pour un produit
   */
  static determineBestStoreForProduct(igaPrice: number | null, metroPrice: number | null): {
    store: "IGA" | "Metro" | null;
    bestPrice: number | null;
  } {
    if (igaPrice === null && metroPrice === null) return { store: null, bestPrice: null };
    if (igaPrice === null) return { store: "Metro", bestPrice: metroPrice };
    if (metroPrice === null) return { store: "IGA", bestPrice: igaPrice };
    
    if (igaPrice < metroPrice) {
      return { store: "IGA", bestPrice: igaPrice };
    } else if (metroPrice < igaPrice) {
      return { store: "Metro", bestPrice: metroPrice };
    } else {
      return { store: "IGA", bestPrice: igaPrice }; // Égalité, on choisit IGA par défaut
    }
  }
}
/**
 * Gestionnaire de cache des prix
 */
export class PriceCache {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Enregistrer dans le cache
   */
  static set(key: string, data: any): void {
    this.cache.set(key, { 
      data, 
      timestamp: Date.now() 
    });
    
    // Nettoyage automatique si cache trop grand
    if (this.cache.size > 1000) {
      this.cleanup();
    }
  }

  /**
   * Récupérer du cache
   */
  static get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Vérifier expiration
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Vider le cache
   */
  static clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache vidé');
  }

  /**
   * Nettoyer les entrées expirées
   */
  static cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} entrées de cache nettoyées`);
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  static getStats(): { size: number; duration: number } {
    return {
      size: this.cache.size,
      duration: this.CACHE_DURATION
    };
  }

  /**
   * Vérifier si une clé existe
   */
  static has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Invalider une clé spécifique
   */
  static invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalider toutes les clés correspondant à un pattern
   */
  static invalidatePattern(pattern: string): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }
}

/**
 * Utilitaires de calcul de prix
 */
export class PriceUtils {
  /**
   * Calculer le prix unitaire (ex: prix par kg, par litre)
   */
  static calculateUnitPrice(price: number, quantity: number, unit: string): string {
    if (quantity <= 0) return "N/A";
    const unitPrice = price / quantity;
    return `$${unitPrice.toFixed(2)}/${unit}`;
  }

  /**
   * Comparer deux prix et retourner la différence en %
   */
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
      difference: Math.round(difference * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      cheaper: price1 < price2 ? 1 : 2
    };
  }

  /**
   * Calculer les économies annuelles potentielles
   */
  static calculateAnnualSavings(weeklySavings: number): number {
    return Math.round(weeklySavings * 52 * 100) / 100;
  }

  /**
   * Arrondir au cent près (canadien)
   */
  static roundToNearestCent(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Appliquer une taxe (TPS + TVQ au Québec)
   */
  static applyTax(amount: number, taxRate: number = 0.14975): number {
    // 14.975% = TPS (5%) + TVQ (9.975%)
    return this.roundToNearestCent(amount * (1 + taxRate));
  }
}
