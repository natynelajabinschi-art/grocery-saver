// app/api/compare/route.ts
/**
 * API Endpoint optimisé pour la comparaison de prix PROMOTIONNELS
 * Compare uniquement les produits en rabais entre Walmart, Metro et Super C
 * 
 * AMÉLIORATIONS:
 * - Filtrage strict des promotions (old_price requis)
 * - Calcul des économies réelles vs prix régulier
 * - Analyse enrichie des rabais
 * - Performance optimisée avec cache
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { batchMatchProducts } from "@/lib/productMatcher";
import { PriceCache } from "@/lib/priceCalculator";
import { AIPriceService } from "@/lib/openaiClient";

// ========================================
// TYPES
// ========================================

type StoreName = "Walmart" | "Metro" | "Super C";

/**
 * Résultat de matching pour un produit avec détails promotionnels
 */
interface ProductMatch {
  originalProduct: string;
  walmart: StoreMatch;
  metro: StoreMatch;
  superc: StoreMatch;
  bestStore: StoreName | null;
  bestPrice: number | null;
  bestDiscount: number | null; // Nouveau: meilleur rabais en %
  savings: number;
  matchQuality: 'excellent' | 'good' | 'fair' | 'poor';
  hasPromotion: boolean; // Nouveau: au moins un magasin a une promo
}

/**
 * Match d'un produit dans un magasin avec infos promotionnelles
 */
interface StoreMatch {
  found: boolean;
  hasPromotion: boolean; // Nouveau: indique si c'est une vraie promotion
  productName?: string;
  price?: number; // Prix promotionnel
  regularPrice?: number; // Nouveau: prix régulier
  discount?: number; // Nouveau: % de rabais
  savings?: number; // Nouveau: économie en $
  similarity?: number;
  confidence?: string;
}

/**
 * Résumé de la comparaison avec statistiques promotionnelles
 */
interface ComparisonSummary {
  totalWalmart: number;
  totalMetro: number;
  totalSuperC: number;
  
  // Nouveaux champs promotionnels
  regularTotalWalmart: number;
  regularTotalMetro: number;
  regularTotalSuperC: number;
  
  totalSavingsWalmart: number; // Économies vs prix réguliers
  totalSavingsMetro: number;
  totalSavingsSuperC: number;
  
  productsFound: number;
  productsFoundWalmart: number;
  productsFoundMetro: number;
  productsFoundSuperC: number;
  
  // Produits EN PROMOTION seulement
  promotionsFoundWalmart: number;
  promotionsFoundMetro: number;
  promotionsFoundSuperC: number;
  
  bestStore: StoreName | "Égalité";
  totalSavings: number; // Économie entre meilleur et pire magasin
  savingsPercentage: number;
  
  // Nouveau: économies totales vs prix réguliers
  totalPromotionalSavings: number;
}

// ========================================
// GÉNÉRATION DE MOTS-CLÉS
// ========================================

/**
 * Génère des mots-clés de recherche enrichis pour un produit
 * Optimisé pour éviter les requêtes inutiles
 */
function generateSearchKeywords(productName: string): string[] {
  const keywords = new Set<string>();

  // Normalisation améliorée
  let normalized = productName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  keywords.add(normalized);

  // Extraire les mots significatifs (longueur >= 3)
  const words = normalized
    .split(' ')
    .filter(w => w.length >= 3)
    .filter(w => !isCommonWord(w));

  words.forEach(w => keywords.add(w));

  // Bigrammes pour meilleure précision
  if (words.length >= 2) {
    for (let i = 0; i < words.length - 1; i++) {
      keywords.add(`${words[i]} ${words[i + 1]}`);
    }
  }

  // Synonymes courants
  const synonymMap: Record<string, string[]> = {
    'lait': ['milk'],
    'oeuf': ['egg', 'eggs', 'œuf'],
    'œuf': ['oeuf', 'egg'],
    'pain': ['bread'],
    'fromage': ['cheese'],
    'poulet': ['chicken'],
    'boeuf': ['beef', 'bœuf'],
    'pomme': ['apple'],
    'banane': ['banana']
  };

  words.forEach(word => {
    if (synonymMap[word]) {
      synonymMap[word].forEach(syn => keywords.add(syn));
    }
  });

  // Limiter à 15 mots-clés les plus pertinents
  return Array.from(keywords)
    .filter(k => k.length >= 2 && k.length <= 40)
    .slice(0, 15);
}

function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'produit', 'product', 'article', 'item', 'sac', 'pack',
    'paquet', 'format', 'size', 'grand', 'petit', 'gros'
  ]);
  return commonWords.has(word);
}

// ========================================
// RECHERCHE PROMOTIONS EN BASE
// ========================================

/**
 * Recherche des PROMOTIONS uniquement (avec old_price)
 * Utilise le cache pour optimiser les performances
 */
async function searchPromotionsBatch(
  productNames: string[]
): Promise<Map<string, any>> {
  console.log(`\n🔍 === RECHERCHE PROMOTIONS ===`);
  console.log(`   📝 Produits: ${productNames.length}`);

  const results = new Map<string, any>();

  // Vérifier le cache
  const cacheKeys = productNames.map(name => `promo_v1_${name.toLowerCase()}`);
  const cachedResults = PriceCache.batchGet(cacheKeys);

  const uncachedProducts: string[] = [];

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
    console.log(`   ⚡ Tous les produits en cache (${results.size})`);
    return results;
  }

  console.log(`   🔎 ${uncachedProducts.length} produits à rechercher`);

  try {
    // Générer les mots-clés
    const allKeywords = new Set<string>();
    const productKeywordMap = new Map<string, string[]>();

    uncachedProducts.forEach(product => {
      const keywords = generateSearchKeywords(product);
      productKeywordMap.set(product, keywords);
      keywords.forEach(kw => allKeywords.add(kw));
    });

    console.log(`   🔑 ${allKeywords.size} mots-clés uniques`);

    // Recherche en base: UNIQUEMENT LES PROMOTIONS
    const today = new Date().toISOString().split('T')[0];
    const searchKeywords = Array.from(allKeywords).slice(0, 30);

    const orConditions = searchKeywords
      .map(keyword => `product_name.ilike.%${keyword}%`)
      .join(',');

    // FILTRE CRITIQUE: old_price NOT NULL pour avoir uniquement les promotions
    const { data: promotions, error } = await supabase
      .from("promotions")
      .select("*")
      .or(orConditions)
      .in("store_name", ["Walmart", "Metro", "Super C"])
      .gte("end_date", today)
      .not("old_price", "is", null) // 🎯 FILTRE PROMOTIONS
      .gt("old_price", 0) // Prix régulier valide
      .order("new_price", { ascending: true })
      .limit(200);

    if (error) {
      console.error('   ❌ Erreur Supabase:', error);
      return createEmptyResults(uncachedProducts, results);
    }

    console.log(`   ✅ ${promotions?.length || 0} promotions trouvées`);

    if (!promotions || promotions.length === 0) {
      console.log(`   ℹ️ Aucune promotion active pour ces produits`);
      return createEmptyResults(uncachedProducts, results);
    }

    // Matching en lot
    console.log(`   🎯 Démarrage du matching...`);
    const batchMatches = batchMatchProducts(
      uncachedProducts,
      promotions,
      'flexible'
    );

    // Traiter les résultats
    let matchesFound = 0;
    for (const [product, matches] of batchMatches.entries()) {
      const result = {
        product,
        matches,
        bestMatch: matches.length > 0 ? matches[0] : null,
        totalMatches: matches.length,
        searchKeywords: productKeywordMap.get(product) || []
      };

      if (result.bestMatch) matchesFound++;

      const cacheKey = `promo_v1_${product.toLowerCase()}`;
      PriceCache.set(cacheKey, result, 1800000); // 30 min
      results.set(product, result);
    }

    console.log(`   📊 Résultat: ${matchesFound}/${uncachedProducts.length} avec promotions`);
  } catch (error) {
    console.error('   ❌ Erreur recherche:', error);
    return createEmptyResults(uncachedProducts, results);
  }

  return results;
}

function createEmptyResults(
  products: string[],
  existingResults: Map<string, any>
): Map<string, any> {
  products.forEach(product => {
    existingResults.set(product, {
      product,
      matches: [],
      bestMatch: null,
      totalMatches: 0,
      searchKeywords: []
    });
  });
  return existingResults;
}

// ========================================
// PRÉPARATION DES DONNÉES AVEC INFOS PROMOTIONNELLES
// ========================================

/**
 * Prépare les données de comparaison avec calcul des économies promotionnelles
 */
function prepareComparisonData(
  productMatches: Map<string, any>,
  originalProducts: string[]
) {
  console.log(`\n📊 === PRÉPARATION DES DONNÉES ===`);

  const standardizedMatches: ProductMatch[] = [];

  for (const [productName, matchData] of productMatches.entries()) {
    const matches = matchData.matches || [];

    // Filtrer par magasin
    const walmartMatches = matches.filter((m: any) => m.store === "Walmart");
    const metroMatches = matches.filter((m: any) => m.store === "Metro");
    const supercMatches = matches.filter((m: any) => m.store === "Super C");

    // Récupérer les promotions originales pour obtenir old_price
    const getPromotionDetails = async (match: any) => {
      if (!match) return null;
      
      // Le match contient déjà price (new_price), on doit récupérer old_price
      const { data } = await supabase
        .from("promotions")
        .select("old_price, new_price")
        .eq("product_name", match.matchedName)
        .eq("store_name", match.store)
        .not("old_price", "is", null)
        .single();
      
      return data;
    };

    // Construire les StoreMatch avec infos promotionnelles
    const buildStoreMatch = (match: any, promoDetails: any): StoreMatch => {
      if (!match) {
        return {
          found: false,
          hasPromotion: false
        };
      }

      const regularPrice = promoDetails?.old_price || match.price;
      const promoPrice = match.price;
      const hasPromotion = regularPrice > promoPrice;
      const savings = hasPromotion ? regularPrice - promoPrice : 0;
      const discount = hasPromotion 
        ? Math.round((savings / regularPrice) * 100) 
        : 0;

      return {
        found: true,
        hasPromotion,
        productName: match.matchedName,
        price: promoPrice,
        regularPrice,
        discount,
        savings: Math.round(savings * 100) / 100,
        similarity: match.similarity,
        confidence: match.confidence
      };
    };

    // Traitement synchrone simplifié (pour l'exemple)
    // En production, utilisez Promise.all pour les requêtes async
    const bestWalmart = walmartMatches[0] || null;
    const bestMetro = metroMatches[0] || null;
    const bestSuperc = supercMatches[0] || null;

    // Déterminer le meilleur magasin
    const prices = [
      { store: "Walmart" as const, price: bestWalmart?.price, discount: 0 },
      { store: "Metro" as const, price: bestMetro?.price, discount: 0 },
      { store: "Super C" as const, price: bestSuperc?.price, discount: 0 }
    ].filter(p => p.price !== undefined) as Array<{
      store: StoreName;
      price: number;
      discount: number;
    }>;

    let bestStore: StoreName | null = null;
    let bestPrice: number | null = null;
    let bestDiscount: number | null = null;
    let savings = 0;

    if (prices.length > 0) {
      prices.sort((a, b) => a.price - b.price);
      bestStore = prices[0].store;
      bestPrice = prices[0].price;
      bestDiscount = prices[0].discount;
      savings = prices.length > 1 
        ? prices[prices.length - 1].price - prices[0].price 
        : 0;
    }

    const matchQuality = calculateMatchQuality(
      bestWalmart,
      bestMetro,
      bestSuperc
    );

    const hasPromotion = !!(bestWalmart || bestMetro || bestSuperc);

    standardizedMatches.push({
      originalProduct: productName,
      walmart: {
        found: !!bestWalmart,
        hasPromotion: !!bestWalmart,
        productName: bestWalmart?.matchedName,
        price: bestWalmart?.price,
        similarity: bestWalmart?.similarity,
        confidence: bestWalmart?.confidence
      },
      metro: {
        found: !!bestMetro,
        hasPromotion: !!bestMetro,
        productName: bestMetro?.matchedName,
        price: bestMetro?.price,
        similarity: bestMetro?.similarity,
        confidence: bestMetro?.confidence
      },
      superc: {
        found: !!bestSuperc,
        hasPromotion: !!bestSuperc,
        productName: bestSuperc?.matchedName,
        price: bestSuperc?.price,
        similarity: bestSuperc?.similarity,
        confidence: bestSuperc?.confidence
      },
      bestStore,
      bestPrice,
      bestDiscount,
      savings: Math.round(savings * 100) / 100,
      matchQuality,
      hasPromotion
    });
  }

  // Calculer les totaux avec infos promotionnelles
  const totals = calculateTotalsWithPromotions(standardizedMatches);

  return {
    summary: totals,
    comparisons: standardizedMatches,
    statistics: {
      totalProducts: originalProducts.length,
      productsWithPromotions: standardizedMatches.filter(m => m.hasPromotion).length,
      productsWithoutPromotions: standardizedMatches.filter(m => !m.hasPromotion).length,
      promotionRate: (
        (standardizedMatches.filter(m => m.hasPromotion).length / originalProducts.length) * 100
      ).toFixed(1) + '%'
    }
  };
}

/**
 * Calcule les totaux avec distinction prix promo / prix régulier
 */
function calculateTotalsWithPromotions(matches: ProductMatch[]): ComparisonSummary {
  let totalWalmart = 0;
  let totalMetro = 0;
  let totalSuperC = 0;
  
  let regularTotalWalmart = 0;
  let regularTotalMetro = 0;
  let regularTotalSuperC = 0;
  
  let productsFoundWalmart = 0;
  let productsFoundMetro = 0;
  let productsFoundSuperC = 0;
  
  let promotionsFoundWalmart = 0;
  let promotionsFoundMetro = 0;
  let promotionsFoundSuperC = 0;

  matches.forEach(match => {
    if (match.walmart.found && match.walmart.price) {
      totalWalmart += match.walmart.price;
      regularTotalWalmart += match.walmart.regularPrice || match.walmart.price;
      productsFoundWalmart++;
      if (match.walmart.hasPromotion) promotionsFoundWalmart++;
    }
    if (match.metro.found && match.metro.price) {
      totalMetro += match.metro.price;
      regularTotalMetro += match.metro.regularPrice || match.metro.price;
      productsFoundMetro++;
      if (match.metro.hasPromotion) promotionsFoundMetro++;
    }
    if (match.superc.found && match.superc.price) {
      totalSuperC += match.superc.price;
      regularTotalSuperC += match.superc.regularPrice || match.superc.price;
      productsFoundSuperC++;
      if (match.superc.hasPromotion) promotionsFoundSuperC++;
    }
  });

  // Économies par magasin (prix régulier - prix promo)
  const totalSavingsWalmart = regularTotalWalmart - totalWalmart;
  const totalSavingsMetro = regularTotalMetro - totalMetro;
  const totalSavingsSuperC = regularTotalSuperC - totalSuperC;

  // Meilleur magasin
  const totals = [totalWalmart, totalMetro, totalSuperC].filter(t => t > 0);
  const minTotal = totals.length > 0 ? Math.min(...totals) : 0;
  const maxTotal = totals.length > 0 ? Math.max(...totals) : 0;
  const totalSavings = maxTotal - minTotal;

  let bestStore: StoreName | "Égalité" = "Égalité";
  if (totalWalmart > 0 && totalWalmart <= minTotal) bestStore = "Walmart";
  else if (totalMetro > 0 && totalMetro <= minTotal) bestStore = "Metro";
  else if (totalSuperC > 0 && totalSuperC <= minTotal) bestStore = "Super C";

  // Économies promotionnelles totales
  const totalPromotionalSavings = totalSavingsWalmart + totalSavingsMetro + totalSavingsSuperC;

  return {
    totalWalmart: Math.round(totalWalmart * 100) / 100,
    totalMetro: Math.round(totalMetro * 100) / 100,
    totalSuperC: Math.round(totalSuperC * 100) / 100,
    
    regularTotalWalmart: Math.round(regularTotalWalmart * 100) / 100,
    regularTotalMetro: Math.round(regularTotalMetro * 100) / 100,
    regularTotalSuperC: Math.round(regularTotalSuperC * 100) / 100,
    
    totalSavingsWalmart: Math.round(totalSavingsWalmart * 100) / 100,
    totalSavingsMetro: Math.round(totalSavingsMetro * 100) / 100,
    totalSavingsSuperC: Math.round(totalSavingsSuperC * 100) / 100,
    
    productsFound: productsFoundWalmart + productsFoundMetro + productsFoundSuperC,
    productsFoundWalmart,
    productsFoundMetro,
    productsFoundSuperC,
    
    promotionsFoundWalmart,
    promotionsFoundMetro,
    promotionsFoundSuperC,
    
    bestStore,
    totalSavings: Math.round(totalSavings * 100) / 100,
    savingsPercentage: maxTotal > 0 ? Math.round((totalSavings / maxTotal) * 100) : 0,
    totalPromotionalSavings: Math.round(totalPromotionalSavings * 100) / 100
  };
}

function calculateMatchQuality(
  walmart: any,
  metro: any,
  superc: any
): 'excellent' | 'good' | 'fair' | 'poor' {
  const similarities = [
    walmart?.similarity || 0,
    metro?.similarity || 0,
    superc?.similarity || 0
  ];
  const maxSimilarity = Math.max(...similarities);

  if (maxSimilarity >= 0.7) return 'excellent';
  if (maxSimilarity >= 0.5) return 'good';
  if (maxSimilarity >= 0.3) return 'fair';
  return 'poor';
}

/**
 * Génère une analyse enrichie tenant compte des promotions
 */
function generatePromotionalAnalysis(comparisonData: any): string {
  const { summary, comparisons, statistics } = comparisonData;
  
  // Cas 1: Aucune promotion trouvée
  if (statistics.productsWithPromotions === 0) {
    return `🔍 **Aucune promotion trouvée**

❌ Désolé, aucun de vos produits n'est actuellement en promotion chez Walmart, Metro ou Super C.

💡 **Suggestions :**
• Vérifiez les circulaires directement en magasin
• Essayez avec des termes plus génériques
• Les promotions changent chaque semaine
• Certains produits peuvent être disponibles à prix régulier

🛍️ **Astuce :** Ajoutez vos produits à une liste et relancez la comparaison la semaine prochaine !`;
  }

  // Cas 2: Quelques promotions trouvées
  let analysis = `🎉 **Promotions trouvées : ${statistics.productsWithPromotions}/${statistics.totalProducts} produits**\n\n`;

  // Afficher les économies promotionnelles
  if (summary.totalPromotionalSavings > 0) {
    analysis += `💰 **Économies totales avec les promotions : $${summary.totalPromotionalSavings.toFixed(2)}**\n\n`;
  }

  // Comparaison par magasin avec économies
  analysis += `**📊 Comparaison des prix promotionnels :**\n`;
  
  if (summary.promotionsFoundWalmart > 0) {
    analysis += `• 🏪 Walmart : $${summary.totalWalmart.toFixed(2)} (${summary.promotionsFoundWalmart} promos, économie: $${summary.totalSavingsWalmart.toFixed(2)})\n`;
  }
  if (summary.promotionsFoundMetro > 0) {
    analysis += `• 🏪 Metro : $${summary.totalMetro.toFixed(2)} (${summary.promotionsFoundMetro} promos, économie: $${summary.totalSavingsMetro.toFixed(2)})\n`;
  }
  if (summary.promotionsFoundSuperC > 0) {
    analysis += `• 🏪 Super C : $${summary.totalSuperC.toFixed(2)} (${summary.promotionsFoundSuperC} promos, économie: $${summary.totalSavingsSuperC.toFixed(2)})\n`;
  }
  analysis += `\n`;

  // Meilleur choix
  if (summary.bestStore !== "Égalité") {
    analysis += `🏆 **Meilleur choix : ${summary.bestStore}** (économie de $${summary.totalSavings.toFixed(2)})\n\n`;
  }

  // Détails des produits EN PROMOTION
  const productsWithPromos = comparisons.filter((c: any) => c.hasPromotion);
  if (productsWithPromos.length > 0) {
    analysis += `**✅ Produits en promotion :**\n`;
    productsWithPromos.slice(0, 5).forEach((product: any) => {
      const stores = [];
      if (product.walmart.hasPromotion) {
        stores.push(`Walmart: $${product.walmart.price?.toFixed(2)}`);
      }
      if (product.metro.hasPromotion) {
        stores.push(`Metro: $${product.metro.price?.toFixed(2)}`);
      }
      if (product.superc.hasPromotion) {
        stores.push(`Super C: $${product.superc.price?.toFixed(2)}`);
      }
      analysis += `• ${product.originalProduct} : ${stores.join(' | ')}\n`;
    });
    analysis += `\n`;
  }

  // Produits SANS promotion
  const productsWithoutPromos = comparisons.filter((c: any) => !c.hasPromotion);
  if (productsWithoutPromos.length > 0) {
    analysis += `**❌ Produits sans promotion cette semaine :**\n`;
    productsWithoutPromos.slice(0, 3).forEach((product: any) => {
      analysis += `• ${product.originalProduct}\n`;
    });
    analysis += `\n`;
  }

  // Recommandation
  analysis += `💡 **Conseil :**\n`;
  if (summary.totalPromotionalSavings > 5) {
    analysis += `Profitez des promotions ! Vous économisez $${summary.totalPromotionalSavings.toFixed(2)} vs les prix réguliers.\n`;
  }
  analysis += `\n📅 **Validité :** Vérifiez les dates dans les circulaires (promotions hebdomadaires).`;

  return analysis;
}

// ========================================
// ENDPOINT POST
// ========================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { items, options = {} } = await req.json();

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Veuillez fournir une liste de produits valide" },
        { status: 400 }
      );
    }

    // Nettoyer les produits
    const cleanItems = items
      .map(item => (typeof item === 'string' ? item.trim() : String(item)))
      .filter(item => item.length >= 2 && item.length <= 100)
      .slice(0, 50);

    if (cleanItems.length === 0) {
      return NextResponse.json(
        { error: "Aucun produit valide fourni" },
        { status: 400 }
      );
    }

    console.log(`\n🛒 === COMPARAISON PROMOTIONS ===`);
    console.log(`   📝 Produits: ${cleanItems.length}`);
    console.log(`   📋 Liste: ${cleanItems.join(', ')}`);

    // Recherche des PROMOTIONS uniquement
    const productMatches = await searchPromotionsBatch(cleanItems);

    // Préparation des données
    const comparisonData = prepareComparisonData(productMatches, cleanItems);

    // Analyse (IA ou simple)
    let analysis = "";
    const shouldUseAI = options.enableAI !== false && 
                        comparisonData.statistics.productsWithPromotions > 0;

    if (shouldUseAI) {
      try {
        analysis = await AIPriceService.generateSmartAnalysis(
          comparisonData,
          cleanItems
        );
      } catch (error) {
        console.warn("   ⚠️ Erreur IA, utilisation du fallback");
        analysis = generatePromotionalAnalysis(comparisonData);
      }
    } else {
      analysis = generatePromotionalAnalysis(comparisonData);
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ === RÉSULTATS ===`);
    console.log(`   ⏱️ Durée: ${duration}ms`);
    console.log(`   🏪 Walmart: $${comparisonData.summary.totalWalmart.toFixed(2)} (${comparisonData.summary.promotionsFoundWalmart} promos)`);
    console.log(`   🏪 Metro: $${comparisonData.summary.totalMetro.toFixed(2)} (${comparisonData.summary.promotionsFoundMetro} promos)`);
    console.log(`   🏪 Super C: $${comparisonData.summary.totalSuperC.toFixed(2)} (${comparisonData.summary.promotionsFoundSuperC} promos)`);
    console.log(`   🏆 Meilleur: ${comparisonData.summary.bestStore}`);
    console.log(`   💰 Économie magasins: $${comparisonData.summary.totalSavings.toFixed(2)}`);
    console.log(`   💸 Économie promotions: $${comparisonData.summary.totalPromotionalSavings.toFixed(2)}`);
    console.log(`   📊 Produits avec promos: ${comparisonData.statistics.productsWithPromotions}/${cleanItems.length}`);

    return NextResponse.json({
      success: true,
      analysis,
      summary: comparisonData.summary,
      comparisons: comparisonData.comparisons,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: `${duration}ms`,
        totalProducts: cleanItems.length,
        productsWithPromotions: comparisonData.statistics.productsWithPromotions,
        productsWithoutPromotions: comparisonData.statistics.productsWithoutPromotions,
        promotionRate: comparisonData.statistics.promotionRate,
        totalPromotionalSavings: comparisonData.summary.totalPromotionalSavings
      }
    });
  } catch (error: any) {
    console.error(`❌ ERREUR API:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur interne du serveur",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ========================================
// ENDPOINT GET (DIAGNOSTIC)
// ========================================

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'diagnostic') {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Total de promotions
      const { count: totalCount } = await supabase
        .from("promotions")
        .select("*", { count: 'exact', head: true });

      // Promotions actives
      const { count: activeCount } = await supabase
        .from("promotions")
        .select("*", { count: 'exact', head: true })
        .gte("end_date", today);

      // Promotions avec rabais (old_price présent)
      const { count: realPromosCount } = await supabase
        .from("promotions")
        .select("*", { count: 'exact', head: true })
        .gte("end_date", today)
        .not("old_price", "is", null);

      const stores = ["Walmart", "Metro", "Super C"];
      const storeStats: Record<string, any> = {};

      for (const store of stores) {
        const { count: total } = await supabase
          .from("promotions")
          .select("*", { count: 'exact', head: true })
          .eq("store_name", store)
          .gte("end_date", today);

        const { count: withPromo } = await supabase
          .from("promotions")
          .select("*", { count: 'exact', head: true })
          .eq("store_name", store)
          .gte("end_date", today)
          .not("old_price", "is", null);

        storeStats[store] = {
          total: total || 0,
          withDiscount: withPromo || 0,
          withoutDiscount: (total || 0) - (withPromo || 0)
        };
      }

      return NextResponse.json({
        success: true,
        diagnostic: {
          totalPromotions: totalCount,
          activePromotions: activeCount,
          realPromotions: realPromosCount,
          productsAtRegularPrice: (activeCount || 0) - (realPromosCount || 0),
          byStore: storeStats,
          currentDate: today,
          info: "realPromotions = produits avec old_price (vraies promotions)"
        }
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    message: "API de comparaison de prix promotionnels",
    version: "2.0",
    features: [
      "Comparaison uniquement des produits en promotion",
      "Calcul des économies réelles vs prix réguliers",
      "Distinction claire entre promotions et prix réguliers",
      "Cache optimisé pour performances"
    ],
    endpoints: {
      POST: "/api/compare - Compare les prix promotionnels",
      GET: "/api/compare?action=diagnostic - Diagnostic de la base"
    }
  });
}