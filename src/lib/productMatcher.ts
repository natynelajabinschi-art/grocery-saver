// lib/productMatcher.ts - VERSION CORRIGÉE AVEC RECHERCHE EXACTE PRIORITAIRE
/**
 * Service de matching intelligent de produits
 * PRIORITÉ: Correspondance exacte > Contient > Sémantique > Fuzzy
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

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et',
  'ou', 'avec', 'sans', 'en', 'au', 'aux', 'the', 'a', 'an'
]);

const UNITS = [
  'kg', 'g', 'l', 'ml', 'lb', 'oz', 'un', 'unité',
  'paquet', 'sachet', 'bouteille', 'bottle', 'can'
];

const SYNONYMS: Record<string, string[]> = {
  'lait': ['milk', 'lait 2%', 'lait 3.25%', 'lait entier', 'whole milk', '2% milk'],
  'fromage': ['cheese', 'cheddar', 'mozzarella', 'gouda', 'swiss', 'brick', 'marble'],
  'beurre': ['butter', 'margarine'],
  'yogourt': ['yogurt', 'yoghourt', 'yogourt grec', 'greek yogurt'],
  'oeuf': ['egg', 'eggs', 'oeufs', 'œuf', 'œufs', 'large eggs', 'white eggs'],
  'œuf': ['oeuf', 'egg', 'eggs', 'oeufs'],
  'pain': ['bread', 'pain blanc', 'white bread', 'brown bread', 'sandwich'],
  'pate': ['pasta', 'pâtes', 'spaghetti', 'macaroni', 'penne'],
  'poulet': ['chicken', 'volaille', 'poultry', 'breast', 'cuisse'],
  'boeuf': ['beef', 'bœuf', 'steak', 'ground beef'],
  'porc': ['pork', 'cochon', 'chop'],
  'saumon': ['salmon', 'atlantic salmon'],
  'pomme': ['apple', 'pommes', 'gala', 'mcintosh'],
  'banane': ['banana', 'bananes'],
  'orange': ['oranges', 'navel'],
  'tomate': ['tomato', 'tomates', 'tomatoes'],
  'carotte': ['carrot', 'carottes', 'carrots'],
  'oignon': ['onion', 'oignons', 'onions'],
  'patate': ['potato', 'potatoes', 'pomme de terre'],
  'jus': ['juice', 'jus orange', 'orange juice'],
  'eau': ['water', 'spring water'],
  'cafe': ['coffee', 'café'],
  'the': ['tea', 'thé'],
  'chips': ['chips', 'crisps'],
  'biscuit': ['cookie', 'biscuits', 'cookies'],
  'chocolat': ['chocolate']
};

// ========================================
// NORMALISATION
// ========================================

export function normalizeProductName(name: string): string {
  let normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  UNITS.forEach(unit => {
    const regex = new RegExp(`\\b${unit}\\b`, 'gi');
    normalized = normalized.replace(regex, ' ');
  });

  normalized = normalized.replace(/\b\d+\b/g, ' ');
  normalized = normalized.replace(/\b\d+\.\d+\b/g, ' ');

  const words = normalized
    .split(/\s+/)
    .filter(word => word.length > 1)
    .filter(word => !STOP_WORDS.has(word))
    .filter(word => !isCommonWord(word));

  return words.join(' ').trim();
}

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
// MATCHING EXACT ET CONTIENT
// ========================================

/**
 * NOUVEAU: Vérifie d'abord si le produit recherché correspond exactement
 * ou est contenu dans le nom du produit (insensible à la casse)
 */
function exactOrContainsMatch(searchTerm: string, candidateName: string): number {
  const searchNorm = searchTerm.toLowerCase().trim();
  const candidateNorm = candidateName.toLowerCase().trim();
  
  // Correspondance exacte (score parfait)
  if (searchNorm === candidateNorm) {
    return 1.0;
  }
  
  // Le terme recherché est contenu dans le nom du candidat
  if (candidateNorm.includes(searchNorm)) {
    return 0.95;
  }
  
  // Le nom du candidat est contenu dans le terme recherché
  if (searchNorm.includes(candidateNorm)) {
    return 0.9;
  }
  
  return 0;
}

// ========================================
// DISTANCE DE LEVENSHTEIN
// ========================================

function levenshteinDistance(str1: string, str2: string): number {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  const matrix: number[][] = Array(str1.length + 1)
    .fill(null)
    .map(() => Array(str2.length + 1).fill(0));

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

function containsMatch(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.8;
  }

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

function semanticSimilarity(product1: string, product2: string): number {
  const words1 = product1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = product2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2) {
        matches += 1;
      } else if (
        SYNONYMS[word1]?.includes(word2) ||
        SYNONYMS[word2]?.includes(word1)
      ) {
        matches += 0.8;
      } else if (areWordsSimilar(word1, word2)) {
        matches += 0.6;
      } else if (word1.includes(word2) || word2.includes(word1)) {
        matches += 0.4;
      }
    }
  }

  const maxPossible = Math.max(words1.length, words2.length);
  return matches / maxPossible;
}

function areWordsSimilar(word1: string, word2: string): boolean {
  if (word1 === word2) return true;

  if (word1 + 's' === word2 || word2 + 's' === word1) return true;
  if (word1 + 'x' === word2 || word2 + 'x' === word1) return true;

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

export function extractKeywords(productName: string): string[] {
  const normalized = normalizeProductName(productName);
  const words = normalized.split(/\s+/);

  return words
    .filter(w => w.length >= 2 && w.length <= 20)
    .slice(0, 5);
}

// ========================================
// MATCHING EN LOT - VERSION CORRIGÉE
// ========================================

function determineMatchType(similarities: {
  exact: number;
  levenshtein: number;
  contains: number;
  semantic: number;
}): 'exact' | 'contains' | 'semantic' | 'fuzzy' {
  // PRIORITÉ 1: Correspondance exacte ou contient
  if (similarities.exact >= 0.9) return 'exact';
  if (similarities.exact >= 0.8) return 'contains';
  
  // PRIORITÉ 2: Autres types de matching
  if (similarities.levenshtein > 0.8) return 'exact';
  if (similarities.contains > 0.5) return 'contains';
  if (similarities.semantic > 0.6) return 'semantic';
  return 'fuzzy';
}

function getConfidenceLevel(similarity: number): 'high' | 'medium' | 'low' {
  if (similarity >= 0.7) return 'high';
  if (similarity >= 0.5) return 'medium';
  return 'low';
}

/**
 * VERSION CORRIGÉE: Matching avec priorité à la correspondance exacte
 */
export function batchMatchProducts(
  searchProducts: string[],
  candidateProducts: CandidateProduct[],
  strategy: 'strict' | 'flexible' | 'broad' = 'flexible'
): Map<string, MatchResult[]> {
  console.log(`\n🎯 === MATCHING EN LOT (CORRIGÉ) ===`);
  console.log(`   🔍 Produits recherchés: ${searchProducts.length}`);
  console.log(`   📦 Candidats disponibles: ${candidateProducts.length}`);
  console.log(`   🎚️ Stratégie: ${strategy}`);

  const results = new Map<string, MatchResult[]>();
  const threshold = strategy === 'strict' ? 0.7 : strategy === 'flexible' ? 0.3 : 0.2;

  const normalizedCandidates = candidateProducts.map(candidate => ({
    ...candidate,
    normalized: normalizeProductName(candidate.product_name),
    keywords: extractKeywords(candidate.product_name)
  }));

  let totalMatches = 0;

  for (const searchProduct of searchProducts) {
    const searchNormalized = normalizeProductName(searchProduct);
    const matches: MatchResult[] = [];

    for (const candidate of normalizedCandidates) {
      // 🔥 NOUVEAU: Vérifier d'abord la correspondance exacte ou contient
      const exactScore = exactOrContainsMatch(searchProduct, candidate.product_name);
      
      // Si on a une correspondance exacte ou très proche, on la prend directement
      if (exactScore >= 0.9) {
        matches.push({
          product: searchProduct,
          matchedName: candidate.product_name,
          similarity: exactScore,
          confidence: 'high',
          normalized: searchNormalized,
          price: candidate.new_price,
          store: candidate.store_name,
          matchType: exactScore === 1.0 ? 'exact' : 'contains'
        });
        totalMatches++;
        continue;
      }

      // Sinon, calculer les autres similarités
      const levenshteinScore = calculateSimilarity(searchProduct, candidate.product_name);
      const containsScore = containsMatch(searchNormalized, candidate.normalized);
      const semanticScore = semanticSimilarity(searchProduct, candidate.product_name);

      // Score composite (prendre le maximum)
      const compositeScore = Math.max(exactScore, levenshteinScore, containsScore, semanticScore);

      if (compositeScore >= threshold) {
        const matchType = determineMatchType({
          exact: exactScore,
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

    // Trier par similarité décroissante et garder top 10 (au lieu de 3)
    const sortedMatches = matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    results.set(searchProduct, sortedMatches);

    // Log des résultats
    if (sortedMatches.length > 0) {
      console.log(`   ✅ "${searchProduct}": ${sortedMatches.length} match(es)`);
      sortedMatches.slice(0, 3).forEach(match => {
        console.log(`      → ${match.store}: "${match.matchedName}" ($${match.price}) - ${match.similarity} (${match.matchType}, ${match.confidence})`);
      });
    } else {
      console.log(`   ❌ "${searchProduct}": Aucun match`);
    }
  }

  console.log(`\n📊 Résumé: ${totalMatches} matches pour ${searchProducts.length} produits`);

  return results;
}