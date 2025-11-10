// lib/productMatcher.ts
/**
 * Service de matching intelligent de produits
 * Utilise plusieurs algorithmes: Levenshtein, containment, semantic matching
 */

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface MatchResult {
  product: string;
  matchedName: string;
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
  normalized: string;
  price?: number;
  store?: string;
  matchType?: 'exact' | 'contains' | 'semantic' | 'fuzzy';
}

interface CandidateProduct {
  product_name: string;
  new_price: number;
  store_name: string;
  old_price?: number | null;
}

// ========================================
// CONFIGURATION
// ========================================

// Mots vides à ignorer
const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et',
  'ou', 'avec', 'sans', 'en', 'au', 'aux', 'the', 'a', 'an'
]);

// Unités de mesure
const UNITS = [
  'kg', 'g', 'l', 'ml', 'lb', 'oz', 'un', 'unité',
  'paquet', 'sachet', 'bouteille', 'bottle', 'can'
];

// ========================================
// DICTIONNAIRE DE SYNONYMES COMPLET
// ========================================

const SYNONYMS: Record<string, string[]> = {
  // Produits laitiers
  'lait': ['milk', 'lait 2%', 'lait 3.25%', 'lait entier', 'whole milk', '2% milk'],
  'fromage': ['cheese', 'cheddar', 'mozzarella', 'gouda', 'swiss', 'brick', 'marble'],
  'beurre': ['butter', 'margarine'],
  'yogourt': ['yogurt', 'yoghourt', 'yogourt grec', 'greek yogurt'],
  'creme': ['cream', 'creme fraiche', 'whipping cream'],

  // Œufs
  'oeuf': ['egg', 'eggs', 'oeufs', 'œuf', 'œufs', 'large eggs', 'white eggs'],
  'œuf': ['oeuf', 'egg', 'eggs', 'oeufs'],

  // Pain et céréales
  'pain': ['bread', 'pain blanc', 'white bread', 'brown bread', 'sandwich'],
  'pate': ['pasta', 'pâtes', 'spaghetti', 'macaroni', 'penne'],
  'pates': ['pasta', 'pâte', 'spaghetti', 'macaroni'],
  'riz': ['rice', 'riz blanc', 'white rice', 'basmati'],

  // Viandes
  'poulet': ['chicken', 'volaille', 'poultry', 'breast', 'cuisse'],
  'boeuf': ['beef', 'bœuf', 'steak', 'ground beef'],
  'porc': ['pork', 'cochon', 'chop'],

  // Poissons
  'poisson': ['fish', 'saumon', 'salmon'],
  'saumon': ['salmon', 'atlantic salmon'],

  // Fruits
  'pomme': ['apple', 'pommes', 'gala', 'mcintosh'],
  'banane': ['banana', 'bananes'],
  'orange': ['oranges', 'navel'],

  // Légumes
  'tomate': ['tomato', 'tomates', 'tomatoes'],
  'carotte': ['carrot', 'carottes', 'carrots'],
  'oignon': ['onion', 'oignons', 'onions'],
  'patate': ['potato', 'potatoes', 'pomme de terre'],

  // Sauces et condiments
  'sauce': ['sauce tomate', 'tomato sauce', 'pasta sauce'],
  'ketchup': ['ketchup', 'catsup'],
  'mayonnaise': ['mayo', 'mayonnaise'],

  // Boissons
  'jus': ['juice', 'jus orange', 'orange juice'],
  'eau': ['water', 'spring water'],
  'cafe': ['coffee', 'café'],
  'the': ['tea', 'thé'],

  // Snacks
  'chips': ['chips', 'crisps'],
  'biscuit': ['cookie', 'biscuits', 'cookies'],
  'chocolat': ['chocolate']
};

// ========================================
// NORMALISATION
// ========================================

/**
 * Normalise un nom de produit pour le matching
 * - Supprime les accents
 * - Convertit en minuscules
 * - Supprime la ponctuation
 * - Supprime les unités de mesure
 * - Supprime les mots vides
 */
export function normalizeProductName(name: string): string {
  // Minuscules et suppression des accents
  let normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Supprimer la ponctuation (garder les espaces)
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  // Remplacer les unités de mesure par des espaces
  UNITS.forEach(unit => {
    const regex = new RegExp(`\\b${unit}\\b`, 'gi');
    normalized = normalized.replace(regex, ' ');
  });

  // Supprimer les nombres isolés
  normalized = normalized.replace(/\b\d+\b/g, ' ');
  normalized = normalized.replace(/\b\d+\.\d+\b/g, ' ');

  // Supprimer les mots vides et mots trop communs
  const words = normalized
    .split(/\s+/)
    .filter(word => word.length > 1)
    .filter(word => !STOP_WORDS.has(word))
    .filter(word => !isCommonWord(word));

  // Retourner la chaîne normalisée
  return words.join(' ').trim();
}

/**
 * Vérifie si un mot est trop commun pour être discriminant
 */
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'produit', 'product', 'article', 'item', 'sac', 'pack',
    'paquet', 'boite', 'boîte', 'can', 'bouteille', 'bottle',
    'format', 'size', 'gros', 'grand', 'petit', 'mini', 'maxi',
    'family', 'familial', 'natural', 'naturel', 'organic',
    'biologique', 'fresh', 'frais'
  ]);
  return commonWords.has(word);
}

// ========================================
// DISTANCE DE LEVENSHTEIN
// ========================================

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * (Nombre minimum d'opérations pour transformer str1 en str2)
 */
function levenshteinDistance(str1: string, str2: string): number {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  const matrix: number[][] = Array(str1.length + 1)
    .fill(null)
    .map(() => Array(str2.length + 1).fill(0));

  // Initialiser la première colonne et ligne
  for (let i = 0; i <= str1.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= str2.length; j++) matrix[0][j] = j;

  // Remplir la matrice
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Suppression
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[str1.length][str2.length];
}

/**
 * Calcule la similarité entre deux chaînes (0-1)
 * Basé sur la distance de Levenshtein
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeProductName(str1);
  const norm2 = normalizeProductName(str2);

  if (norm1 === norm2) return 1.0;
  if (norm1.length === 0 || norm2.length === 0) return 0;

  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);

  return 1 - distance / maxLength;
}

// ========================================
// CONTAINMENT MATCHING
// ========================================

/**
 * Vérifie si une chaîne contient l'autre (matching par inclusion)
 */
function containsMatch(str1: string, str2: string): number {
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
    const maxWords = Math.max(words1.length, words2.length);
    return Math.min(0.7, commonWords / maxWords);
  }

  return 0;
}

// ========================================
// SEMANTIC MATCHING
// ========================================

/**
 * Calcule la similarité sémantique entre deux produits
 * Utilise le dictionnaire de synonymes
 */
function semanticSimilarity(product1: string, product2: string): number {
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
      else if (
        SYNONYMS[word1]?.includes(word2) ||
        SYNONYMS[word2]?.includes(word1)
      ) {
        matches += 0.8;
      }
      // Mots similaires (pluriels, variations)
      else if (areWordsSimilar(word1, word2)) {
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
 * Vérifie si deux mots sont similaires (pluriels, variations)
 */
function areWordsSimilar(word1: string, word2: string): boolean {
  if (word1 === word2) return true;

  // Pluriels
  if (word1 + 's' === word2 || word2 + 's' === word1) return true;
  if (word1 + 'x' === word2 || word2 + 'x' === word1) return true;

  // Variations courantes
  const variations: Record<string, string[]> = {
    'oeuf': ['œuf'],
    'œuf': ['oeuf'],
    'pate': ['pâte'],
    'pates': ['pâtes']
  };

  if (variations[word1]?.includes(word2) || variations[word2]?.includes(word1)) {
    return true;
  }

  return false;
}

// ========================================
// EXTRACTION DE MOTS-CLÉS
// ========================================

/**
 * Extrait les mots-clés pertinents d'un nom de produit
 */
export function extractKeywords(productName: string): string[] {
  const normalized = normalizeProductName(productName);
  const words = normalized.split(/\s+/);

  return words
    .filter(w => w.length >= 2 && w.length <= 20)
    .slice(0, 5); // Max 5 mots-clés
}

// ========================================
// MATCHING EN LOT
// ========================================

/**
 * Détermine le type de match basé sur les scores
 */
function determineMatchType(similarities: {
  levenshtein: number;
  contains: number;
  semantic: number;
}): 'exact' | 'contains' | 'semantic' | 'fuzzy' {
  if (similarities.levenshtein > 0.8) return 'exact';
  if (similarities.contains > 0.5) return 'contains';
  if (similarities.semantic > 0.6) return 'semantic';
  return 'fuzzy';
}

/**
 * Détermine le niveau de confiance basé sur la similarité
 */
function getConfidenceLevel(similarity: number): 'high' | 'medium' | 'low' {
  if (similarity >= 0.7) return 'high';
  if (similarity >= 0.5) return 'medium';
  return 'low';
}

/**
 * Matching en lot - Compare plusieurs produits avec plusieurs candidats
 * @param searchProducts - Produits recherchés
 * @param candidateProducts - Produits disponibles en circulaire
 * @param strategy - Stratégie de matching ('strict' | 'flexible' | 'broad')
 * @returns Map des résultats de matching par produit
 */
export function batchMatchProducts(
  searchProducts: string[],
  candidateProducts: CandidateProduct[],
  strategy: 'strict' | 'flexible' | 'broad' = 'flexible'
): Map<string, MatchResult[]> {
  console.log(`\n🎯 === MATCHING EN LOT ===`);
  console.log(`   📝 Produits recherchés: ${searchProducts.length}`);
  console.log(`   📦 Candidats disponibles: ${candidateProducts.length}`);
  console.log(`   🎚️ Stratégie: ${strategy}`);

  const results = new Map<string, MatchResult[]>();

  // Définir le seuil selon la stratégie
  const threshold = strategy === 'strict' ? 0.7 : strategy === 'flexible' ? 0.3 : 0.2;

  // Pré-normaliser les candidats pour optimisation
  const normalizedCandidates = candidateProducts.map(candidate => ({
    ...candidate,
    normalized: normalizeProductName(candidate.product_name),
    keywords: extractKeywords(candidate.product_name)
  }));

  let totalMatches = 0;

  // Parcourir chaque produit recherché
  for (const searchProduct of searchProducts) {
    const searchNormalized = normalizeProductName(searchProduct);
    const searchKeywords = extractKeywords(searchProduct);

    const matches: MatchResult[] = [];

    // Comparer avec chaque candidat
    for (const candidate of normalizedCandidates) {
      // Calcul des différentes similarités
      const levenshteinScore = calculateSimilarity(searchProduct, candidate.product_name);
      const containsScore = containsMatch(searchNormalized, candidate.normalized);
      const semanticScore = semanticSimilarity(searchProduct, candidate.product_name);

      // Score composite (prendre le maximum)
      const compositeScore = Math.max(levenshteinScore, containsScore, semanticScore);

      // Vérifier le seuil
      if (compositeScore >= threshold) {
        const matchType = determineMatchType({
          levenshtein: levenshteinScore,
          contains: containsScore,
          semantic: semanticScore
        });

        matches.push({
          product: searchProduct,
          matchedName: candidate.product_name,
          similarity: Math.round(compositeScore * 100) / 100,
          confidence: getConfidenceLevel(compositeScore),
          normalized: searchNormalized,
          price: candidate.new_price,
          store: candidate.store_name,
          matchType
        });

        totalMatches++;
      }
    }

    // Trier par similarité décroissante et garder top 3
    const sortedMatches = matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    results.set(searchProduct, sortedMatches);

    // Log des résultats
    if (sortedMatches.length > 0) {
      console.log(`   ✅ "${searchProduct}": ${sortedMatches.length} match(es)`);
      sortedMatches.forEach(match => {
        console.log(`      → ${match.store}: "${match.matchedName}" ($${match.price}) - ${match.similarity} (${match.confidence})`);
      });
    } else {
      console.log(`   ❌ "${searchProduct}": Aucun match`);
    }
  }

  console.log(`\n📊 Résumé: ${totalMatches} matches pour ${searchProducts.length} produits`);

  return results;
}