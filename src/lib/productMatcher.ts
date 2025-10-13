// lib/productMatcher.ts - ALGORITHME DE MATCHING INTELLIGENT

interface MatchResult {
  product: string;
  matchedName: string;
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
  normalized: string;
}

export class ProductMatcher {
  // Mots à ignorer pour la comparaison
  private static STOP_WORDS = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du',
    'et', 'ou', 'avec', 'sans', 'en', 'au', 'aux'
  ]);

  // Unités de mesure communes
  private static UNITS = ['kg', 'g', 'l', 'ml', 'lb', 'oz', 'un', 'unité', 'paquet'];

  /**
   * Distance de Levenshtein - Mesure la similarité entre deux chaînes
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // Suppression
          matrix[i][j - 1] + 1,      // Insertion
          matrix[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Calcule le score de similarité (0-1)
   */
  static calculateSimilarity(str1: string, str2: string): number {
    const norm1 = this.normalizeProductName(str1);
    const norm2 = this.normalizeProductName(str2);

    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);

    if (maxLength === 0) return 1;

    return 1 - (distance / maxLength);
  }

  /**
   * Normalise un nom de produit pour la comparaison
   */
  static normalizeProductName(name: string): string {
    let normalized = name.toLowerCase().trim();

    // Remplacer les accents
    normalized = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Supprimer la ponctuation
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

    // Supprimer les unités de mesure
    this.UNITS.forEach(unit => {
      normalized = normalized.replace(new RegExp(`\\b${unit}\\b`, 'g'), '');
    });

    // Supprimer les nombres (formats, quantités)
    normalized = normalized.replace(/\b\d+(\.\d+)?\b/g, '');

    // Supprimer les mots vides
    const words = normalized.split(/\s+/).filter(word => 
      word.length > 2 && !this.STOP_WORDS.has(word)
    );

    return words.join(' ').trim();
  }

  /**
   * Trouve le meilleur match pour un produit dans une liste
   */
  static findBestMatch(
    searchProduct: string,
    candidateProducts: Array<{ product_name: string; new_price: number; store_name: string; old_price?: number | null }>
  ): MatchResult | null {
    if (!candidateProducts || candidateProducts.length === 0) {
      return null;
    }

    let bestMatch: MatchResult | null = null;
    let highestSimilarity = 0;

    for (const candidate of candidateProducts) {
      const similarity = this.calculateSimilarity(searchProduct, candidate.product_name);

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        
        let confidence: 'high' | 'medium' | 'low';
        if (similarity >= 0.8) confidence = 'high';
        else if (similarity >= 0.6) confidence = 'medium';
        else confidence = 'low';

        bestMatch = {
          product: searchProduct,
          matchedName: candidate.product_name,
          similarity: Math.round(similarity * 100) / 100,
          confidence,
          normalized: this.normalizeProductName(searchProduct)
        };
      }
    }

    // Seuil minimum de similarité : 0.5 (50%)
    if (bestMatch && bestMatch.similarity >= 0.5) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Trouve plusieurs matches potentiels (pour substituts)
   */
  static findMultipleMatches(
    searchProduct: string,
    candidateProducts: Array<{ product_name: string; new_price: number; store_name: string }>,
    limit: number = 3
  ): MatchResult[] {
    const matches: Array<MatchResult & { price: number; store: string }> = [];

    for (const candidate of candidateProducts) {
      const similarity = this.calculateSimilarity(searchProduct, candidate.product_name);

      if (similarity >= 0.5) {
        let confidence: 'high' | 'medium' | 'low';
        if (similarity >= 0.8) confidence = 'high';
        else if (similarity >= 0.6) confidence = 'medium';
        else confidence = 'low';

        matches.push({
          product: searchProduct,
          matchedName: candidate.product_name,
          similarity: Math.round(similarity * 100) / 100,
          confidence,
          normalized: this.normalizeProductName(searchProduct),
          price: candidate.new_price,
          store: candidate.store_name
        });
      }
    }

    // Trier par similarité décroissante
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Extrait les mots-clés principaux d'un produit
   */
  static extractKeywords(productName: string): string[] {
    const normalized = this.normalizeProductName(productName);
    const words = normalized.split(/\s+/);
    
    // Garder les 2-3 mots les plus significatifs
    return words.slice(0, 3).filter(w => w.length > 2);
  }

  /**
   * Génère des variantes de recherche pour un produit
   */
  static generateSearchVariants(productName: string): string[] {
    const variants = new Set<string>();
    
    // Version originale
    variants.add(productName.toLowerCase().trim());
    
    // Version normalisée
    const normalized = this.normalizeProductName(productName);
    if (normalized) variants.add(normalized);
    
    // Mots-clés principaux
    const keywords = this.extractKeywords(productName);
    keywords.forEach(kw => variants.add(kw));
    
    // Premier mot significatif
    const firstWord = keywords[0];
    if (firstWord) variants.add(firstWord);
    
    return Array.from(variants).filter(v => v.length >= 3);
  }
}