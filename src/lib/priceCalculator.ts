// lib/priceCalculator.ts - GESTION DU CACHE ET CALCULS PRÉCIS

export interface PriceComparison {
  product: string;
  igaPrice: number | null;
  metroPrice: number | null;
  bestPrice: number | null;
  bestStore: "IGA" | "Metro" | null;
  savings: number;
  unit: string;
  confidence: number;
}

export class PriceCalculator {
  /**
   * Calcul précis du total avec arrondi
   */
  static calculateTotal(prices: (number | null)[]): number {
    const validPrices = prices.filter((p): p is number => p !== null && p > 0);
    const total = validPrices.reduce((sum, price) => sum + price, 0);
    return Math.round(total * 100) / 100;
  }

  /**
   * Calcul des économies
   */
  static calculateSavings(igaPrice: number | null, metroPrice: number | null): number {
    if (igaPrice === null && metroPrice === null) return 0;
    if (igaPrice === null) return 0;
    if (metroPrice === null) return 0;
    
    return Math.round(Math.abs(igaPrice - metroPrice) * 100) / 100;
  }

  /**
   * Déterminer le meilleur magasin
   */
  static determineBestStore(
    igaTotal: number, 
    metroTotal: number
  ): { store: "IGA" | "Metro"; savings: number } {
    if (igaTotal < metroTotal) {
      return { store: "IGA", savings: metroTotal - igaTotal };
    } else if (metroTotal < igaTotal) {
      return { store: "Metro", savings: igaTotal - metroTotal };
    } else {
      return { store: "IGA", savings: 0 };
    }
  }

  /**
   * Vérifier la fraîcheur des données
   */
  static isDataFresh(lastUpdated: string): boolean {
    const lastUpdate = new Date(lastUpdated);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  }

  /**
   * Calculer le pourcentage d'économie
   */
  static calculateSavingsPercentage(savings: number, totalPrice: number): number {
    if (totalPrice === 0) return 0;
    return Math.round((savings / totalPrice) * 100 * 100) / 100;
  }

  /**
   * Formater un prix pour l'affichage
   */
  static formatPrice(price: number | null): string {
    if (price === null) return "N/A";
    return `$${price.toFixed(2)}`;
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