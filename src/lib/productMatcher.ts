// lib/productMatcher.ts - VERSION CORRIGÉE
interface MatchResult {
  product: string;
  matchedName: string;
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
  normalized: string;
  price?: number;
  store?: string;
  matchType?: 'exact' | 'contains' | 'semantic' | 'fuzzy';
}

export class ProductMatcher {
  private static STOP_WORDS = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'avec', 'sans', 'en', 'au', 'aux'
  ]);

  private static UNITS = ['kg', 'g', 'l', 'ml', 'lb', 'oz', 'un', 'unité', 'paquet', 'sachet', 'bouteille'];

  // Dictionnaire de synonymes ÉTENDU pour les produits de base
  private static SYNONYMS: Record<string, string[]> = {
    'lait': ['lait', 'milk', 'laitue', 'laitage', 'lait 2%', 'lait 3.25%', 'lait entier'],
    'oeuf': ['oeuf', 'oeufs', 'egg', 'eggs', 'œuf', 'œufs', 'large eggs', 'white eggs', 'brown eggs'],
    'œuf': ['oeuf', 'oeufs', 'egg', 'eggs', 'œuf', 'œufs', 'large eggs', 'white eggs', 'brown eggs'],
    'pain': ['pain', 'bread', 'baguette', 'pain blanc', 'pain brun', 'pain de mie', 'sandwich bread'],
    'fromage': ['fromage', 'cheese', 'cheddar', 'mozzarella', 'gouda', 'swiss', 'marble cheese', 'fromage râpé'],
    'poulet': ['poulet', 'chicken', 'volaille', 'poultry', 'poulet entier', 'chicken breast'],
    'boeuf': ['boeuf', 'beef', 'bœuf', 'viande rouge', 'steak', 'ground beef'],
    'poisson': ['poisson', 'fish', 'saumon', 'truite', 'thon', 'salmon', 'trout', 'tuna'],
    'yaourt': ['yaourt', 'yogourt', 'yoghourt', 'yogurt', 'yogourt grec', 'greek yogurt'],
    'tomate': ['tomate', 'tomates', 'tomato', 'tomatoes'],
    'pomme': ['pomme', 'pommes', 'apple', 'apples'],
    'carotte': ['carotte', 'carottes', 'carrot', 'carrots'],
    'orange': ['orange', 'oranges', 'orange juice', 'jus dorange'],
    'jus': ['jus', 'juice', 'juss', 'orange juice', 'apple juice'],
    'pate': ['pate', 'pasta', 'spaghetti', 'noodles', 'penne', 'macaroni'],
    'riz': ['riz', 'rice', 'riz blanc', 'white rice', 'brown rice'],
    'huile': ['huile', 'oil', 'huile olive', 'olive oil', 'vegetable oil'],
    'sucre': ['sucre', 'sugar', 'sucré', 'white sugar', 'brown sugar'],
    'farine': ['farine', 'flour', 'farine blé', 'all-purpose flour']
  };

  /**
   * Matching en lot CORRIGÉ avec seuils abaissés
   */
  static batchMatchProducts(
    searchProducts: string[],
    candidateProducts: Array<{ product_name: string; new_price: number; store_name: string; old_price?: number | null }>,
    strategy: 'strict' | 'flexible' | 'broad' = 'flexible'
  ): Map<string, MatchResult[]> {
    const results = new Map<string, MatchResult[]>();
    
    console.log(`\n🔍 Matching en lot: ${searchProducts.length} produits vs ${candidateProducts.length} candidats`);

    // Pré-calcul des normalisations pour optimisation
    const normalizedCandidates = candidateProducts.map(candidate => ({
      ...candidate,
      normalized: this.normalizeProductName(candidate.product_name),
      keywords: this.extractKeywords(candidate.product_name)
    }));

    let totalMatches = 0;

    for (const searchProduct of searchProducts) {
      const searchNormalized = this.normalizeProductName(searchProduct);
      const searchKeywords = this.extractKeywords(searchProduct);

      console.log(`   🔎 "${searchProduct}" → normalisé: "${searchNormalized}"`);

      const matches: MatchResult[] = [];

      for (const candidate of normalizedCandidates) {
        // Similarité basique avec Levenshtein
        const basicSimilarity = this.calculateSimilarity(searchNormalized, candidate.normalized);
        
        // Vérification de contenu
        const containsScore = this.containsMatch(searchNormalized, candidate.normalized);
        
        // Similarité sémantique avec synonymes
        const semanticScore = this.semanticSimilarity(searchProduct, candidate.product_name);

        // Score composite (plus permissif)
        let compositeScore = basicSimilarity;
        if (containsScore > 0) compositeScore = Math.max(compositeScore, containsScore);
        if (semanticScore > 0) compositeScore = Math.max(compositeScore, semanticScore);

        // SEUIL ABAISSÉ pour plus de résultats
        if (compositeScore >= 0.3) { // Seuil réduit de 0.4 à 0.3
          const matchType = this.determineMatchType({
            levenshtein: basicSimilarity,
            contains: containsScore,
            semantic: semanticScore
          });

          matches.push({
            product: searchProduct,
            matchedName: candidate.product_name,
            similarity: Math.round(compositeScore * 100) / 100,
            confidence: this.getConfidenceLevel(compositeScore),
            normalized: searchNormalized,
            price: candidate.new_price,
            store: candidate.store_name,
            matchType
          });
          
          totalMatches++;
        }
      }

      // Trier et limiter les résultats
      const sortedMatches = matches
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3); // Top 3 matches

      results.set(searchProduct, sortedMatches);

      if (sortedMatches.length > 0) {
        console.log(`   ✅ ${sortedMatches.length} match(es) trouvé(s)`);
        sortedMatches.forEach(match => {
          console.log(`      → "${match.matchedName}" (${match.similarity} - ${match.confidence})`);
        });
      } else {
        console.log(`   ❌ Aucun match trouvé`);
      }
    }

    console.log(`   📊 Total: ${totalMatches} matches pour ${searchProducts.length} produits`);
    return results;
  }

  /**
   * Normalisation CORRIGÉE - moins agressive
   */
  static normalizeProductName(name: string): string {
    let normalized = name.toLowerCase().trim();

    // Remplacer les accents mais garder les caractères spéciaux
    normalized = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Supprimer seulement la ponctuation gênante
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

    // Remplacer les unités de mesure par des espaces (pas les supprimer complètement)
    this.UNITS.forEach(unit => {
      normalized = normalized.replace(new RegExp(`\\b${unit}\\b`, 'g'), ' ');
    });

    // Supprimer les nombres isolés mais garder les marques
    normalized = normalized.replace(/\b\d+\b/g, ' ');
    normalized = normalized.replace(/\b\d+\.\d+\b/g, ' ');

    // Supprimer les mots vides et espaces multiples
    const words = normalized.split(/\s+/)
      .filter(word => word.length > 1 && !this.STOP_WORDS.has(word))
      .filter(word => !this.isCommonWord(word));

    return words.join(' ').trim();
  }

  /**
   * Vérification de contenu CORRIGÉE
   */
  private static containsMatch(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    // Vérification directe
    if (str1.includes(str2) || str2.includes(str1)) {
      return 0.8;
    }

    // Vérification par mots
    const words1 = str1.split(' ').filter(w => w.length > 2);
    const words2 = str2.split(' ').filter(w => w.length > 2);

    let commonWords = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2) {
          commonWords++;
        } else if (word1.includes(word2) || word2.includes(word1)) {
          commonWords += 0.7;
        }
      }
    }

    if (commonWords > 0) {
      return Math.min(0.7, commonWords * 0.3);
    }

    return 0;
  }

  /**
   * Similarité sémantique CORRIGÉE
   */
  private static semanticSimilarity(product1: string, product2: string): number {
    const words1 = product1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = product2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        // Correspondance exacte
        if (word1 === word2) {
          matches += 1;
        } 
        // Synonymes
        else if (this.SYNONYMS[word1]?.includes(word2) || this.SYNONYMS[word2]?.includes(word1)) {
          matches += 0.8;
        }
        // Mots similaires (pluriels, variations)
        else if (this.areWordsSimilar(word1, word2)) {
          matches += 0.6;
        }
        // Substrings
        else if (word1.includes(word2) || word2.includes(word1)) {
          matches += 0.4;
        }
      }
    }

    const maxPossible = Math.max(words1.length, words2.length);
    return matches / maxPossible;
  }

  /**
   * Vérifie si les mots sont similaires
   */
  private static areWordsSimilar(word1: string, word2: string): boolean {
    if (word1 === word2) return true;
    
    // Gestion des pluriels
    if ((word1 + 's' === word2) || (word2 + 's' === word1)) return true;
    if ((word1 + 'x' === word2) || (word2 + 'x' === word1)) return true;
    
    // Variations courantes
    const variations: Record<string, string[]> = {
      'oeuf': ['œuf'],
      'œuf': ['oeuf'],
      'fromage': ['cheese'],
      'lait': ['milk'],
      'pain': ['bread'],
      'poulet': ['chicken']
    };

    if (variations[word1]?.includes(word2) || variations[word2]?.includes(word1)) {
      return true;
    }

    return false;
  }

  /**
   * Vérifie si un mot est commun
   */
  private static isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'produit', 'product', 'article', 'item', 'sac', 'pack', 'paquet', 
      'boite', 'boîte', 'can', 'bouteille', 'bottle', 'format', 'size',
      'gros', 'grand', 'petit', 'mini', 'maxi', 'family', 'familial',
      'natural', 'naturel', 'organic', 'biologique', 'fresh', 'frais'
    ]);
    return commonWords.has(word);
  }

  private static determineMatchType(similarities: any): string {
    if (similarities.levenshtein > 0.8) return 'exact';
    if (similarities.contains > 0.5) return 'contains';
    if (similarities.semantic > 0.6) return 'semantic';
    return 'fuzzy';
  }

  private static getConfidenceLevel(similarity: number): 'high' | 'medium' | 'low' {
    if (similarity >= 0.7) return 'high';
    if (similarity >= 0.5) return 'medium';
    return 'low';
  }

  // Méthodes existantes conservées
  private static levenshteinDistance(str1: string, str2: string): number {
    if (str1 === str2) return 0;
    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    const matrix: number[][] = Array(str1.length + 1).fill(null).map(() => Array(str2.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= str2.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[str1.length][str2.length];
  }

  static calculateSimilarity(str1: string, str2: string): number {
    const norm1 = this.normalizeProductName(str1);
    const norm2 = this.normalizeProductName(str2);

    if (norm1 === norm2) return 1.0;

    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);

    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  static extractKeywords(productName: string): string[] {
    const normalized = this.normalizeProductName(productName);
    const words = normalized.split(/\s+/);
    
    return words
      .filter(w => w.length >= 2 && w.length <= 20)
      .slice(0, 5);
  }
}