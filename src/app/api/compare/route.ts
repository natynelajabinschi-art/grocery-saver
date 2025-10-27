import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { ProductMatcher } from "@/lib/productMatcher";
import { PriceCache, PriceCalculator } from "@/lib/priceCalculator";
import { AIPriceService } from "@/lib/openaiClient";

type StoreName = "IGA" | "Metro" | "Super-C";

interface ProductMatch {
  originalProduct: string;
  iga: {
    found: boolean;
    productName?: string;
    price?: number;
    oldPrice?: number;
    similarity?: number;
    confidence?: string;
    hasPromotion?: boolean;
    matchType?: string;
  };
  metro: {
    found: boolean;
    productName?: string;
    price?: number;
    oldPrice?: number;
    similarity?: number;
    confidence?: string;
    hasPromotion?: boolean;
    matchType?: string;
  };
  superc: {
    found: boolean;
    productName?: string;
    price?: number;
    oldPrice?: number;
    similarity?: number;
    confidence?: string;
    hasPromotion?: boolean;
    matchType?: string;
  };
  bestStore: StoreName | null;
  bestPrice: number | null;
  savings: number;
  matchQuality: 'excellent' | 'good' | 'fair' | 'poor';
  searchKeywords: string[];
}

/**
 * 🔥 GÉNÉRATEUR DE MOTS-CLÉS ULTRA-OPTIMISÉ
 */
function generateEnhancedKeywords(productName: string): string[] {
  const keywords = new Set<string>();
  // Ajouter le produit original
  keywords.add(productName.toLowerCase());
  // Normalisation douce
  let normalized = productName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  keywords.add(normalized);
  // Extraction de mots (seuil 2 caractères)
  const words = normalized.split(' ')
    .filter(w => w.length >= 2)
    .filter(w => !isCommonWord(w));
  words.forEach(w => keywords.add(w));
  // Bigrammes (2 mots consécutifs)
  if (words.length >= 2) {
    for (let i = 0; i < words.length - 1; i++) {
      keywords.add(`${words[i]} ${words[i + 1]}`);
    }
  }
  // 🔥 SYNONYMES ÉTENDUS
  const synonyms: Record<string, string[]> = {
    // Produits laitiers
    'lait': ['milk', 'lait 2%', 'lait 3.25%', 'lait entier', 'lait ecreme', '2% milk', 'whole milk'],
    'fromage': ['cheese', 'cheddar', 'mozzarella', 'gouda', 'marble', 'swiss', 'brick', 'colby'],
    'beurre': ['butter', 'margarine', 'becel'],
    'yogourt': ['yogurt', 'yoghourt', 'yogourt grec', 'greek yogurt', 'danone', 'activia'],
    'creme': ['cream', 'creme fraiche', 'whipping cream', '35%'],
    // Œufs
    'oeuf': ['egg', 'eggs', 'oeufs', 'large eggs', 'white eggs', 'brown eggs', 'omega'],
    'œuf': ['egg', 'eggs', 'oeuf', 'oeufs', 'large eggs', 'white eggs'],
    // Pain et céréales
    'pain': ['bread', 'pain blanc', 'pain brun', 'white bread', 'brown bread', 'sandwich', 'pom'],
    'pate': ['pasta', 'pates', 'spaghetti', 'macaroni', 'penne', 'fusilli', 'linguine', 'catelli'],
    'pates': ['pasta', 'pate', 'spaghetti', 'macaroni', 'penne', 'fusilli', 'linguine', 'catelli'],
    'riz': ['rice', 'riz blanc', 'white rice', 'basmati', 'jasmin'],
    'cereale': ['cereal', 'cereales', 'corn flakes', 'cheerios', 'special k'],
    // Viandes
    'poulet': ['chicken', 'volaille', 'poultry', 'breast', 'cuisse', 'thigh', 'drumstick'],
    'boeuf': ['beef', 'bœuf', 'steak', 'ground beef', 'boeuf hache', 'rosbif', 'roast'],
    'porc': ['pork', 'cochon', 'chop', 'roast', 'bacon', 'jambon'],
    'poisson': ['fish', 'saumon', 'salmon', 'truite', 'trout', 'tilapia', 'morue'],
    'saumon': ['salmon', 'atlantic salmon', 'sockeye'],
    // Fruits
    'pomme': ['apple', 'pommes', 'gala', 'mcintosh', 'granny smith', 'cortland'],
    'banane': ['banana', 'bananes'],
    'orange': ['oranges', 'navel', 'mandarine'],
    'fraise': ['strawberry', 'fraises', 'strawberries'],
    'raisin': ['grape', 'raisins', 'grapes'],
    // Légumes
    'tomate': ['tomato', 'tomates', 'tomatoes', 'cherry tomatoes', 'roma'],
    'carotte': ['carrot', 'carottes', 'carrots'],
    'oignon': ['onion', 'oignons', 'onions', 'spanish', 'red onion'],
    'laitue': ['lettuce', 'romaine', 'iceberg'],
    'pomme terre': ['potato', 'pommes de terre', 'potatoes', 'russet', 'yukon'],
    'patate': ['potato', 'potatoes', 'pomme de terre'],
    // Sauces et condiments
    'sauce': ['sauce tomate', 'tomato sauce', 'pasta sauce', 'marinara', 'alfredo', 'pesto'],
    'ketchup': ['ketchup', 'heinz', 'french'],
    'mayonnaise': ['mayo', 'mayonnaise', 'hellmann'],
    'moutarde': ['mustard', 'dijon'],
    // Huiles et vinaigres
    'huile': ['oil', 'huile olive', 'olive oil', 'canola', 'vegetable oil'],
    'vinaigre': ['vinegar', 'balsamic', 'apple cider vinegar'],
    // Sucre et farines
    'sucre': ['sugar', 'sucre blanc', 'white sugar', 'brown sugar', 'cassonade'],
    'farine': ['flour', 'farine blanche', 'all-purpose flour', 'whole wheat'],
    // Boissons
    'jus': ['juice', 'jus orange', 'orange juice', 'apple juice', 'tropicana', 'minute maid'],
    'eau': ['water', 'spring water', 'eska', 'naya'],
    'cafe': ['coffee', 'café', 'nabob', 'folgers', 'maxwell'],
    'the': ['tea', 'thé', 'green tea', 'black tea', 'herbal'],
    // Snacks
    'chips': ['chips', 'crisps', 'lays', 'ruffles', 'pringles'],
    'biscuit': ['cookie', 'biscuits', 'cookies', 'oreo', 'chips ahoy'],
    'chocolat': ['chocolate', 'cadbury', 'lindt', 'toblerone'],
    // Produits surgelés
    'surgele': ['frozen', 'congele', 'congelé'],
    'pizza': ['pizzas', 'delissio'],
    // Nettoyage
    'savon': ['soap', 'dove', 'ivory'],
    'papier': ['paper', 'toilet paper', 'tissue', 'royale', 'scotties'],
  };
  // Ajouter tous les synonymes pertinents
  words.forEach(word => {
    if (synonyms[word]) {
      synonyms[word].forEach(syn => {
        if (syn.length >= 2) {
          keywords.add(syn);
        }
      });
    }
  });
  // 🔥 DÉTECTION DE PATTERNS SPÉCIAUX
  const normalizedLower = normalized.toLowerCase();
  // Détection de marques communes
  const brands = ['natrel', 'quebon', 'lactantia', 'black diamond', 'saputo', 'catelli',
                  'barilla', 'heinz', 'hellmann', 'kraft', 'campbells', 'no name', 'selection'];
  brands.forEach(brand => {
    if (normalizedLower.includes(brand)) {
      keywords.add(brand);
    }
  });
  // Détection de formats (%, L, kg, g, lb)
  const formatMatches = normalizedLower.match(/\d+\s*(%|l|kg|g|lb|ml)/gi);
  if (formatMatches) {
    formatMatches.forEach(format => keywords.add(format));
  }
  // 🔥 VARIANTES ORTHOGRAPHIQUES
  const variants: Record<string, string[]> = {
    'pate': ['pâte', 'pasta'],
    'pates': ['pâtes', 'pasta'],
    'oeuf': ['œuf'],
    'boeuf': ['bœuf'],
    'ble': ['blé'],
    'creme': ['crème'],
    'the': ['thé']
  };
  words.forEach(word => {
    if (variants[word]) {
      variants[word].forEach(variant => keywords.add(variant));
    }
  });
  // Filtrer et limiter
  return Array.from(keywords)
    .filter(k => k.length >= 2 && k.length <= 40)
    .slice(0, 20); // Max 20 mots-clés
}

/**
 * Mots trop communs à filtrer
 */
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'produit', 'product', 'article', 'item', 'sac', 'pack',
    'paquet', 'boite', 'boîte', 'can', 'bouteille', 'bottle',
    'format', 'size', 'de', 'le', 'la', 'les', 'un', 'une', 'des'
  ]);
  return commonWords.has(word);
}

/**
 * 🔍 RECHERCHE BATCH ULTRA-OPTIMISÉE
 */
async function searchProductsBatchEnhanced(productNames: string[]): Promise<Map<string, any>> {
  console.log(`\n🔍 Recherche BATCH avancée: ${productNames.length} produits`);
  // Étape 1: Vérification du cache en lot
  const cacheKeys = productNames.map(name => `product_v4_${name.toLowerCase()}`);
  const cachedResults = PriceCache.batchGet(cacheKeys);
  const results = new Map<string, any>();
  const uncachedProducts: string[] = [];
  // Récupérer les résultats du cache
  cacheKeys.forEach((key, index) => {
    const productName = productNames[index];
    const cached = cachedResults.get(key);
    if (cached) {
      results.set(productName, cached);
    } else {
      uncachedProducts.push(productName);
    }
  });
  if (uncachedProducts.length === 0) {
    console.log(`⚡ Tous les produits en cache (${results.size})`);
    return results;
  }
  console.log(`   📝 ${uncachedProducts.length} produits à rechercher`);
  try {
    // Étape 2: Génération des mots-clés
    const allKeywords = new Set<string>();
    const productKeywordMap = new Map<string, string[]>();
    uncachedProducts.forEach(product => {
      const keywords = generateEnhancedKeywords(product);
      productKeywordMap.set(product, keywords);
      keywords.forEach(kw => allKeywords.add(kw));
    });
    console.log(`   🔑 ${allKeywords.size} mots-clés uniques générés`);
    if (uncachedProducts.length <= 5) {
      console.log(`   📋 Mots-clés générés:`);
      uncachedProducts.forEach(product => {
        console.log(`      "${product}": [${productKeywordMap.get(product)?.join(', ')}]`);
      });
    }
    // Étape 3: Recherche en base (IGA, Metro, Super-C)
    const allPromotions = await searchWithAllKeywordsOptimized(Array.from(allKeywords));
    console.log(`   ✅ ${allPromotions.length} promotions récupérées`);
    if (allPromotions.length === 0) {
      console.log('   ⚠️ Aucune promotion trouvée, création de résultats vides');
      uncachedProducts.forEach(product => {
        const emptyResult = createEmptyProductResult(product, productKeywordMap.get(product) || []);
        const cacheKey = `product_v4_${product.toLowerCase()}`;
        PriceCache.set(cacheKey, emptyResult);
        results.set(product, emptyResult);
      });
      return results;
    }
    // Étape 4: Matching en lot
    console.log(`   🎯 Début du matching...`);
    const batchMatches = ProductMatcher.batchMatchProducts(
      uncachedProducts,
      allPromotions,
      'flexible'
    );
    // Étape 5: Traitement des résultats
    let matchesFound = 0;
    for (const [product, matches] of batchMatches.entries()) {
      const bestMatch = matches.length > 0 ? matches[0] : null;
      const result = {
        product,
        matches,
        bestMatch,
        totalMatches: matches.length,
        searchKeywords: productKeywordMap.get(product) || [],
        matchStats: {
          exactMatches: matches.filter(m => m.matchType === 'exact').length,
          highConfidence: matches.filter(m => m.confidence === 'high').length,
          mediumConfidence: matches.filter(m => m.confidence === 'medium').length
        }
      };
      if (bestMatch) matchesFound++;
      const cacheKey = `product_v4_${product.toLowerCase()}`;
      PriceCache.set(cacheKey, result);
      results.set(product, result);
    }
    console.log(`   📊 Matching terminé: ${matchesFound}/${uncachedProducts.length} avec résultats`);
  } catch (error) {
    console.error('❌ Erreur recherche batch:', error);
    uncachedProducts.forEach(product => {
      const errorResult = createEmptyProductResult(product, []);
      results.set(product, errorResult);
    });
  }
  return results;
}

/**
 * 🔍 RECHERCHE OPTIMISÉE AVEC MOTS-CLÉS (IGA, Metro, Super-C)
 */
async function searchWithAllKeywordsOptimized(keywords: string[]): Promise<any[]> {
  if (keywords.length === 0) return [];
  const today = new Date().toISOString().split('T')[0];
  console.log(`   🔍 Recherche en base avec ${keywords.length} mots-clés...`);
  try {
    const searchKeywords = keywords
      .sort((a, b) => a.length - b.length)
      .slice(0, 30);
    const orConditions = searchKeywords
      .map(keyword => `product_name.ilike.%${keyword}%`)
      .join(',');
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .or(orConditions)
      .in("store_name", ["IGA", "Metro", "Super-C"])
      .gte("end_date", today)
      .order("new_price", { ascending: true })
      .limit(200);
    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return [];
    }
    if (data && data.length > 0) {
      console.log(`   📋 Exemples de promotions:`);
      data.slice(0, 5).forEach((item: any) => {
        console.log(`      - ${item.store_name}: "${item.product_name}" - $${item.new_price}`);
      });
    }
    return data || [];
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    return [];
  }
}

/**
 * Créer un résultat vide
 */
function createEmptyProductResult(productName: string, keywords: string[]): any {
  return {
    product: productName,
    matches: [],
    bestMatch: null,
    totalMatches: 0,
    searchKeywords: keywords,
    matchStats: {
      exactMatches: 0,
      highConfidence: 0,
      mediumConfidence: 0
    }
  };
}

/**
 * 📊 PRÉPARATION DES DONNÉES DE COMPARAISON
 */
function prepareEnhancedComparisonData(
  productMatches: Map<string, any>,
  originalProducts: string[]
) {
  console.log(`\n📊 Préparation des données de comparaison...`);
  const standardizedMatches: ProductMatch[] = [];
  let totalMatchesFound = 0;
  for (const [productName, matchData] of productMatches.entries()) {
    const matches = matchData.matches || [];
    const igaMatches = matches.filter((m: any) => m.store === "IGA");
    const metroMatches = matches.filter((m: any) => m.store === "Metro");
    const supercMatches = matches.filter((m: any) => m.store === "Super-C");
    const bestIgaMatch = igaMatches.length > 0 ? igaMatches[0] : null;
    const bestMetroMatch = metroMatches.length > 0 ? metroMatches[0] : null;
    const bestSupercMatch = supercMatches.length > 0 ? supercMatches[0] : null;
    const hasIga = bestIgaMatch !== null;
    const hasMetro = bestMetroMatch !== null;
    const hasSuperc = bestSupercMatch !== null;
    let bestStore: StoreName | null = null;
    let bestPrice: number | null = null;
    let savings = 0;
    const prices = [
      { store: "IGA" as const, price: bestIgaMatch?.price },
      { store: "Metro" as const, price: bestMetroMatch?.price },
      { store: "Super-C" as const, price: bestSupercMatch?.price }
    ].filter(p => p.price !== undefined) as Array<{ store: StoreName; price: number }>;
    if (prices.length > 0) {
      prices.sort((a, b) => a.price - b.price);
      bestStore = prices[0].store;
      bestPrice = prices[0].price;
      savings = prices.length > 1 ? prices[prices.length - 1].price - prices[0].price : 0;
    }
    const matchQuality = calculateMatchQuality(bestIgaMatch, bestMetroMatch, bestSupercMatch);
    const productMatch: ProductMatch = {
      originalProduct: productName,
      iga: hasIga ? {
        found: true,
        productName: bestIgaMatch.matchedName,
        price: bestIgaMatch.price,
        oldPrice: null,
        similarity: bestIgaMatch.similarity,
        confidence: bestIgaMatch.confidence,
        hasPromotion: false,
        matchType: bestIgaMatch.matchType
      } : { found: false },
      metro: hasMetro ? {
        found: true,
        productName: bestMetroMatch.matchedName,
        price: bestMetroMatch.price,
        oldPrice: null,
        similarity: bestMetroMatch.similarity,
        confidence: bestMetroMatch.confidence,
        hasPromotion: false,
        matchType: bestMetroMatch.matchType
      } : { found: false },
      superc: hasSuperc ? {
        found: true,
        productName: bestSupercMatch.matchedName,
        price: bestSupercMatch.price,
        oldPrice: null,
        similarity: bestSupercMatch.similarity,
        confidence: bestSupercMatch.confidence,
        hasPromotion: false,
        matchType: bestSupercMatch.matchType
      } : { found: false },
      bestStore,
      bestPrice,
      savings: Math.round(savings * 100) / 100,
      matchQuality,
      searchKeywords: matchData.searchKeywords || []
    };
    standardizedMatches.push(productMatch);
    if (hasIga || hasMetro || hasSuperc) {
      totalMatchesFound++;
      console.log(`   ✅ "${productName}" → ${hasIga ? 'IGA' : ''}${hasIga && (hasMetro || hasSuperc) ? '+' : ''}${hasMetro ? 'Metro' : ''}${hasMetro && hasSuperc ? '+' : ''}${hasSuperc ? 'Super-C' : ''}`);
      if (hasIga) console.log(`      IGA: "${bestIgaMatch.matchedName}" - $${bestIgaMatch.price} (${bestIgaMatch.similarity})`);
      if (hasMetro) console.log(`      Metro: "${bestMetroMatch.matchedName}" - $${bestMetroMatch.price} (${bestMetroMatch.similarity})`);
      if (hasSuperc) console.log(`      Super-C: "${bestSupercMatch.matchedName}" - $${bestSupercMatch.price} (${bestSupercMatch.similarity})`);
    } else {
      console.log(`   ❌ "${productName}" → Aucun match`);
    }
  }
  console.log(`   ✅ ${totalMatchesFound}/${originalProducts.length} produits avec correspondances`);
  const totals = calculateEnhancedTotals(standardizedMatches);
  const matchQuality = analyzeOverallMatchQuality(standardizedMatches);
  const missingProducts = findMissingProducts(standardizedMatches, originalProducts);
  const summary = {
    totalIga: totals.igaTotal,
    totalMetro: totals.metroTotal,
    totalSuperc: totals.supercTotal,
    totalSavings: Math.abs(Math.min(totals.igaTotal, totals.metroTotal, totals.supercTotal) - Math.max(totals.igaTotal, totals.metroTotal, totals.supercTotal)),
    bestStore: determineBestStore(totals.igaTotal, totals.metroTotal, totals.supercTotal),
    productsFound: totalMatchesFound,
    totalProducts: originalProducts.length,
    productsFoundIga: standardizedMatches.filter(m => m.iga.found).length,
    productsFoundMetro: standardizedMatches.filter(m => m.metro.found).length,
    productsFoundSuperc: standardizedMatches.filter(m => m.superc.found).length,
    priceDifference: {
      igaVsMetro: totals.igaTotal - totals.metroTotal,
      igaVsSuperc: totals.igaTotal - totals.supercTotal,
      metroVsSuperc: totals.metroTotal - totals.supercTotal,
    },
    savingsPercentage: calculateSavingsPercentage(totals.igaTotal, totals.metroTotal, totals.supercTotal),
    matchQuality,
    missingProducts,
    averageConfidence: calculateAverageConfidence(standardizedMatches)
  };
  return {
    summary,
    detailedComparison: standardizedMatches,
    rawMatches: Object.fromEntries(productMatches),
    statistics: {
      totalProducts: originalProducts.length,
      productsWithMatches: totalMatchesFound,
      matchRate: (totalMatchesFound / originalProducts.length * 100).toFixed(1) + '%',
      qualityBreakdown: matchQuality
    }
  };
}

/**
 * Calculer les totaux
 */
function calculateEnhancedTotals(matches: ProductMatch[]): { igaTotal: number; metroTotal: number; supercTotal: number } {
  let igaTotal = 0;
  let metroTotal = 0;
  let supercTotal = 0;
  matches.forEach(match => {
    if (match.iga.found && (match.iga.similarity || 0) >= 0.4) {
      igaTotal += match.iga.price || 0;
    }
    if (match.metro.found && (match.metro.similarity || 0) >= 0.4) {
      metroTotal += match.metro.price || 0;
    }
    if (match.superc.found && (match.superc.similarity || 0) >= 0.4) {
      supercTotal += match.superc.price || 0;
    }
  });
  return {
    igaTotal: Math.round(igaTotal * 100) / 100,
    metroTotal: Math.round(metroTotal * 100) / 100,
    supercTotal: Math.round(supercTotal * 100) / 100
  };
}

/**
 * Déterminer le meilleur magasin
 */
function determineBestStore(igaTotal: number, metroTotal: number, supercTotal: number): StoreName | "Égalité" {
  const minTotal = Math.min(igaTotal, metroTotal, supercTotal);
  if (minTotal === igaTotal && minTotal !== metroTotal && minTotal !== supercTotal) return "IGA";
  if (minTotal === metroTotal && minTotal !== supercTotal) return "Metro";
  if (minTotal === supercTotal) return "Super-C";
  return "Égalité";
}

/**
 * Calculer le pourcentage d'économie
 */
function calculateSavingsPercentage(igaTotal: number, metroTotal: number, supercTotal: number): number {
  const maxTotal = Math.max(igaTotal, metroTotal, supercTotal);
  if (maxTotal === 0) return 0;
  const minTotal = Math.min(igaTotal, metroTotal, supercTotal);
  const savings = maxTotal - minTotal;
  return Math.round((savings / maxTotal) * 100 * 100) / 100;
}

/**
 * Analyser la qualité globale des matches
 */
function analyzeOverallMatchQuality(matches: ProductMatch[]): {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
} {
  const quality = { excellent: 0, good: 0, fair: 0, poor: 0 };
  matches.forEach(match => {
    quality[match.matchQuality]++;
  });
  return quality;
}

/**
 * Calculer la qualité du match
 */
function calculateMatchQuality(igaMatch: any, metroMatch: any, supercMatch: any): 'excellent' | 'good' | 'fair' | 'poor' {
  const similarities = [
    igaMatch?.similarity || 0,
    metroMatch?.similarity || 0,
    supercMatch?.similarity || 0
  ];
  const maxSimilarity = Math.max(...similarities);
  if (maxSimilarity >= 0.7) return 'excellent';
  if (maxSimilarity >= 0.5) return 'good';
  if (maxSimilarity >= 0.3) return 'fair';
  return 'poor';
}

/**
 * Trouver les produits manquants
 */
function findMissingProducts(matches: ProductMatch[], originalProducts: string[]): string[] {
  return originalProducts.filter(originalProduct => {
    const match = matches.find(m => m.originalProduct === originalProduct);
    if (!match) return true;
    const hasValidIga = match.iga.found && (match.iga.similarity || 0) >= 0.4;
    const hasValidMetro = match.metro.found && (match.metro.similarity || 0) >= 0.4;
    const hasValidSuperc = match.superc.found && (match.superc.similarity || 0) >= 0.4;
    return !hasValidIga && !hasValidMetro && !hasValidSuperc;
  });
}

/**
 * Calculer la confiance moyenne
 */
function calculateAverageConfidence(matches: ProductMatch[]): number {
  const validMatches = matches.filter(m => m.iga.found || m.metro.found || m.superc.found);
  if (validMatches.length === 0) return 0;
  const totalConfidence = validMatches.reduce((sum, match) => {
    const igaConfidence = match.iga.found ? (match.iga.similarity || 0) : 0;
    const metroConfidence = match.metro.found ? (match.metro.similarity || 0) : 0;
    const supercConfidence = match.superc.found ? (match.superc.similarity || 0) : 0;
    return sum + Math.max(igaConfidence, metroConfidence, supercConfidence);
  }, 0);
  return Math.round((totalConfidence / validMatches.length) * 100) / 100;
}

/**
 * 📝 ANALYSE DE SECOURS
 */
function generateEnhancedFallbackAnalysis(comparisonData: any): string {
  const { summary } = comparisonData;
  if (!summary || summary.productsFound === 0) {
    return `❌ **Aucun produit trouvé dans les circulaires actuelles**
🔍 **Suggestions pour améliorer les résultats:**
• Utilisez des termes plus simples (ex: "lait" au lieu de "lait Natrel 2%")
• Vérifiez l'orthographe des produits
• Les promotions changent chaque semaine - réessayez plus tard
• Essayez des synonymes (ex: "fromage" pour "cheddar")`;
  }
  const bestStore = summary.bestStore;
  const savings = summary.totalSavings;
  const savingsPercent = summary.savingsPercentage;
  let analysis = `🎯 **Recommandation: ${bestStore}**\n\n`;
  // Section économies
  if (savings >= 10) {
    analysis += `💰 **ÉCONOMIE IMPORTANTE: ${savings.toFixed(2)} (${savingsPercent.toFixed(1)}%)**\n`;
  } else if (savings >= 5) {
    analysis += `💵 **Économie: ${savings.toFixed(2)} (${savingsPercent.toFixed(1)}%)**\n`;
  } else if (savings > 0) {
    analysis += `📊 Différence: ${savings.toFixed(2)}\n`;
  } else {
    analysis += `⚖️ **Prix identiques dans les trois magasins**\n`;
  }
  // Section détails
  analysis += `\n📦 **Détails du panier:**\n`;
  analysis += `• IGA: ${summary.totalIga.toFixed(2)} (${summary.productsFoundIga} produits)\n`;
  analysis += `• Metro: ${summary.totalMetro.toFixed(2)} (${summary.productsFoundMetro} produits)\n`;
  analysis += `• Super-C: ${summary.totalSuperc.toFixed(2)} (${summary.productsFoundSuperc} produits)\n`;
  analysis += `• Produits trouvés: ${summary.productsFound}/${summary.totalProducts}\n`;
  // Section qualité des matches
  if (summary.matchQuality.excellent > 0) {
    analysis += `• 🔍 ${summary.matchQuality.excellent} correspondance(s) excellente(s)\n`;
  }
  if (summary.matchQuality.good > 0) {
    analysis += `• ✅ ${summary.matchQuality.good} correspondance(s) bonne(s)\n`;
  }
  // Section produits manquants
  if (summary.missingProducts && summary.missingProducts.length > 0) {
    analysis += `\n⚠️ **Produits non trouvés:** ${summary.missingProducts.slice(0, 3).join(', ')}`;
    if (summary.missingProducts.length > 3) {
      analysis += `... (${summary.missingProducts.length - 3} autres)`;
    }
  }
  // Section conseils
  analysis += `\n\n💡 **Conseil:** `;
  if (bestStore === "Égalité") {
    analysis += `Choisissez en fonction de votre proximité ou préférence personnelle.`;
  } else {
    analysis += `Privilégiez ${bestStore} pour économiser sur votre panier actuel.`;
  }
  if (summary.productsFound < summary.totalProducts) {
    analysis += ` Vérifiez les produits manquants en magasin.`;
  }
  return analysis;
}

/**
 * 🚀 ENDPOINT POST PRINCIPAL
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { items, options = {} } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        error: "Veuillez fournir une liste de produits valide"
      }, { status: 400 });
    }
    // Nettoyer et valider les produits
    const cleanItems = items
      .map(item => typeof item === 'string' ? item.trim() : String(item))
      .filter(item => item.length >= 2 && item.length <= 100)
      .slice(0, 50);
    if (cleanItems.length === 0) {
      return NextResponse.json({
        error: "Aucun produit valide fourni (min 2 caractères, max 100)"
      }, { status: 400 });
    }
    console.log(`\n🛒 DÉBUT COMPARAISON BATCH`);
    console.log(`   Produits: ${cleanItems.length}`);
    console.log(`   Liste: ${cleanItems.join(', ')}`);
    // Étape 1: Recherche BATCH
    const productMatches = await searchProductsBatchEnhanced(cleanItems);
    // Étape 2: Préparation des données
    const comparisonData = prepareEnhancedComparisonData(productMatches, cleanItems);
    // Étape 3: Génération de l'analyse IA
    let aiAnalysis = "";
    const shouldUseAI = options.enableAI !== false && comparisonData.summary.productsFound > 0;
    if (shouldUseAI) {
      try {
        aiAnalysis = await AIPriceService.generateSmartAnalysis(comparisonData, cleanItems);
        console.log("   ✅ Analyse IA générée");
      } catch (error) {
        console.warn("   ⚠️ Erreur IA, utilisation du fallback:", error);
        aiAnalysis = generateEnhancedFallbackAnalysis(comparisonData);
      }
    } else {
      aiAnalysis = generateEnhancedFallbackAnalysis(comparisonData);
    }
    const duration = Date.now() - startTime;
    console.log(`\n📈 RÉSULTATS FINAUX:`);
    console.log(`   Durée: ${duration}ms`);
    console.log(`   IGA: ${comparisonData.summary.totalIga.toFixed(2)}`);
    console.log(`   Metro: ${comparisonData.summary.totalMetro.toFixed(2)}`);
    console.log(`   Super-C: ${comparisonData.summary.totalSuperc.toFixed(2)}`);
    console.log(`   Économie: ${comparisonData.summary.totalSavings.toFixed(2)}`);
    console.log(`   Meilleur: ${comparisonData.summary.bestStore}`);
    console.log(`   Correspondances: ${comparisonData.summary.productsFound}/${cleanItems.length}`);
    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
      summary: comparisonData.summary,
      comparisons: comparisonData.detailedComparison,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: `${duration}ms`,
        totalProducts: cleanItems.length,
        productsWithMatches: comparisonData.summary.productsFound,
        matchRate: comparisonData.statistics.matchRate,
        matchQuality: comparisonData.summary.matchQuality,
        cacheStatus: {
          total: cleanItems.length,
          cached: cleanItems.length - (productMatches.size - Array.from(productMatches.values()).filter((m: any) => m.totalMatches > 0).length)
        }
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ ERREUR API (${duration}ms):`, error);
    return NextResponse.json({
      success: false,
      error: "Erreur interne du serveur",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * 🔍 ENDPOINT GET POUR TESTS
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get('action');
  // 1. DIAGNOSTIC GÉNÉRAL
  if (action === 'diagnostic') {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('\n🔍 DIAGNOSTIC DE LA BASE DE DONNÉES\n');
      // Compter toutes les promotions
      const { count: totalCount } = await supabase
        .from("promotions")
        .select("*", { count: 'exact', head: true });
      console.log(`📊 Total promotions en base: ${totalCount}`);
      // Compter les promotions actives
      const { data: activePromos, count: activeCount } = await supabase
        .from("promotions")
        .select("*", { count: 'exact' })
        .gte("end_date", today);
      console.log(`✅ Promotions actives (end_date >= ${today}): ${activeCount}`);
      // Compter par magasin
      const { data: igaData } = await supabase
        .from("promotions")
        .select("*", { count: 'exact' })
        .eq("store_name", "IGA")
        .gte("end_date", today);
      const { data: metroData } = await supabase
        .from("promotions")
        .select("*", { count: 'exact' })
        .eq("store_name", "Metro")
        .gte("end_date", today);
      const { data: supercData } = await supabase
        .from("promotions")
        .select("*", { count: 'exact' })
        .eq("store_name", "Super-C")
        .gte("end_date", today);
      console.log(`   - IGA: ${igaData?.length || 0} promotions`);
      console.log(`   - Metro: ${metroData?.length || 0} promotions`);
      console.log(`   - Super-C: ${supercData?.length || 0} promotions`);
      // Exemples de produits par catégorie
      const categories = [
        { name: 'Café', keywords: ['cafe', 'coffee'] },
        { name: 'Sucre', keywords: ['sucre', 'sugar'] },
        { name: 'Farine', keywords: ['farine', 'flour'] },
        { name: 'Lait', keywords: ['lait', 'milk'] },
        { name: 'Pain', keywords: ['pain', 'bread'] },
        { name: 'Fromage', keywords: ['fromage', 'cheese'] },
        { name: 'Œufs', keywords: ['oeuf', 'egg'] }
      ];
      const categoryResults: any = {};
      for (const category of categories) {
        const orConditions = category.keywords
          .map(kw => `product_name.ilike.%${kw}%`)
          .join(',');
        const { data, count } = await supabase
          .from("promotions")
          .select("product_name, store_name, new_price", { count: 'exact' })
          .or(orConditions)
          .gte("end_date", today)
          .limit(3);
        categoryResults[category.name] = {
          found: count || 0,
          examples: data || []
        };
        console.log(`\n📦 ${category.name}: ${count || 0} produits trouvés`);
        if (data && data.length > 0) {
          data.forEach((p: any) => {
            console.log(`   - ${p.store_name}: ${p.product_name} - $${p.new_price}`);
          });
        }
      }
      // Vérifier les dates des promotions
      const { data: dateRange } = await supabase
        .from("promotions")
        .select("start_date, end_date")
        .order("end_date", { ascending: false })
        .limit(1);
      return NextResponse.json({
        success: true,
        diagnostic: {
          totalPromotions: totalCount,
          activePromotions: activeCount,
          byStore: {
            IGA: igaData?.length || 0,
            Metro: metroData?.length || 0,
            SuperC: supercData?.length || 0
          },
          currentDate: today,
          latestPromoEndDate: dateRange?.[0]?.end_date,
          categories: categoryResults
        },
        recommendations: [
          activeCount === 0 ? "⚠️ AUCUNE PROMOTION ACTIVE - Vérifiez vos dates ou relancez le scraping" : null,
          (igaData?.length || 0) === 0 ? "⚠️ Aucune promotion IGA active" : null,
          (metroData?.length || 0) === 0 ? "⚠️ Aucune promotion Metro active" : null,
          (supercData?.length || 0) === 0 ? "⚠️ Aucune promotion Super-C active" : null,
          categoryResults['Café'].found === 0 ? "⚠️ Aucun café trouvé - Produit absent de la base" : null,
          categoryResults['Sucre'].found === 0 ? "⚠️ Aucun sucre trouvé - Produit absent de la base" : null,
          categoryResults['Farine'].found === 0 ? "⚠️ Aucune farine trouvée - Produit absent de la base" : null
        ].filter(r => r !== null)
      });
    } catch (error: any) {
      console.error('❌ Erreur diagnostic:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
  }
  // 2. LISTER TOUS LES MAGASINS DISPONIBLES
  if (action === 'stores') {
    try {
      const { data } = await supabase
        .from("promotions")
        .select("store_name")
        .limit(1000);
      const stores = new Set(data?.map(p => p.store_name));
      const storesArray = Array.from(stores);
      return NextResponse.json({
        success: true,
        stores: storesArray,
        count: storesArray.length,
        message: "Tous les magasins disponibles dans la base"
      });
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
  }
  // 3. VOIR LES DATES DES PROMOTIONS
  if (action === 'dates') {
    try {
      const { data } = await supabase
        .from("promotions")
        .select("start_date, end_date, store_name")
        .order("end_date", { ascending: false })
        .limit(20);
      const today = new Date().toISOString().split('T')[0];
      return NextResponse.json({
        success: true,
        today,
        promotions: data,
        message: "Dernières dates de promotions"
      });
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
  }
  // Par défaut : documentation
  return NextResponse.json({
    message: "API de diagnostic de la base de données",
    endpoints: {
      diagnostic: "/api/compare?action=diagnostic - Analyse complète de la base",
      stores: "/api/compare?action=stores - Liste tous les magasins",
      dates: "/api/compare?action=dates - Vérifier les dates des promotions",
      products: "/api/compare?action=products - Voir les produits disponibles"
    }
  });
}
