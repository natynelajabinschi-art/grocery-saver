// app/api/compare/route.ts - VERSION CORRIGÉE CALCULS
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { batchMatchProducts } from "@/lib/productMatcher";
import { PriceCache } from "@/lib/priceCalculator";
import { AIPriceService } from "@/lib/openaiClient";

type StoreName = "Walmart" | "Metro" | "Super C";

interface ProductMatch {
  originalProduct: string;
  walmart: StoreMatch;
  metro: StoreMatch;
  superc: StoreMatch;
  bestStore: StoreName | null;
  bestPrice: number | null;
  bestDiscount: number | null;
  savings: number;
  matchQuality: 'excellent' | 'good' | 'fair' | 'poor';
  hasPromotion: boolean;
}

interface StoreMatch {
  found: boolean;
  hasPromotion: boolean;
  productName?: string;
  price?: number;
  regularPrice?: number;
  discount?: number;
  savings?: number;
  similarity?: number;
  confidence?: string;
}

interface ComparisonSummary {
  totalWalmart: number;
  totalMetro: number;
  totalSuperC: number;
  regularTotalWalmart: number;
  regularTotalMetro: number;
  regularTotalSuperC: number;
  totalSavingsWalmart: number;
  totalSavingsMetro: number;
  totalSavingsSuperC: number;
  productsFound: number; // Nombre unique de produits trouvés
  productsFoundWalmart: number;
  productsFoundMetro: number;
  productsFoundSuperC: number;
  promotionsFoundWalmart: number;
  promotionsFoundMetro: number;
  promotionsFoundSuperC: number;
  totalPromotionsCount: number; // NOUVEAU: Total de toutes les promos trouvées
  bestStore: StoreName | "Égalité";
  bestStoreReason: string;
  totalSavings: number;
  savingsPercentage: number;
  totalPromotionalSavings: number;
  totalProducts: number;
}

// ========================================
// LOGIQUE DE RECOMMANDATION INTELLIGENTE
// ========================================

function determineBestStoreIntelligent(
  walmart: { promos: number; promoTotal: number; total: number },
  metro: { promos: number; promoTotal: number; total: number },
  superc: { promos: number; promoTotal: number; total: number }
): { bestStore: StoreName | "Égalité"; reason: string } {
  
  const tolerance = 0.01;
  const maxPromos = Math.max(walmart.promos, metro.promos, superc.promos);
  
  if (maxPromos === 0) {
    return compareTotalPrices(walmart, metro, superc);
  }

  const storesWithMaxPromos = [];
  if (walmart.promos === maxPromos) storesWithMaxPromos.push({ name: "Walmart" as const, ...walmart });
  if (metro.promos === maxPromos) storesWithMaxPromos.push({ name: "Metro" as const, ...metro });
  if (superc.promos === maxPromos) storesWithMaxPromos.push({ name: "Super C" as const, ...superc });

  if (storesWithMaxPromos.length === 1) {
    const winner = storesWithMaxPromos[0];
    return {
      bestStore: winner.name,
      reason: `Plus de promotions (${maxPromos}) et meilleur prix total`
    };
  }

  const promoPrices = storesWithMaxPromos.map(s => ({ 
    name: s.name, 
    promoTotal: s.promoTotal,
    total: s.total
  }));
  
  const minPromoTotal = Math.min(...promoPrices.map(s => s.promoTotal));
  const storesWithMinPromoTotal = promoPrices.filter(
    s => Math.abs(s.promoTotal - minPromoTotal) < tolerance
  );

  if (storesWithMinPromoTotal.length === 1) {
    const winner = storesWithMinPromoTotal[0];
    const saving = Math.max(...promoPrices.map(s => s.promoTotal)) - minPromoTotal;
    return {
      bestStore: winner.name,
      reason: `Même nombre de promotions (${maxPromos}) mais meilleur prix sur les produits en rabais (économie: $${saving.toFixed(2)})`
    };
  }

  const minTotal = Math.min(...storesWithMinPromoTotal.map(s => s.total));
  const finalWinners = storesWithMinPromoTotal.filter(
    s => Math.abs(s.total - minTotal) < tolerance
  );

  if (finalWinners.length > 1) {
    return {
      bestStore: "Égalité",
      reason: `Prix identiques avec ${maxPromos} promotion${maxPromos > 1 ? 's' : ''} chacun`
    };
  }

  const finalWinner = finalWinners[0];
  const totalSaving = Math.max(...storesWithMinPromoTotal.map(s => s.total)) - minTotal;
  return {
    bestStore: finalWinner.name,
    reason: `Même nombre de promotions (${maxPromos}), prix identiques en rabais, mais meilleur prix total (économie: $${totalSaving.toFixed(2)})`
  };
}

function compareTotalPrices(
  walmart: { total: number },
  metro: { total: number },
  superc: { total: number }
): { bestStore: StoreName | "Égalité"; reason: string } {
  
  const tolerance = 0.01;
  const totals = [
    { name: "Walmart" as const, total: walmart.total },
    { name: "Metro" as const, total: metro.total },
    { name: "Super C" as const, total: superc.total }
  ].filter(s => s.total > 0);

  if (totals.length === 0) {
    return { bestStore: "Égalité", reason: "Aucun produit trouvé" };
  }

  const minTotal = Math.min(...totals.map(s => s.total));
  const winners = totals.filter(s => Math.abs(s.total - minTotal) < tolerance);

  if (winners.length > 1) {
    return { 
      bestStore: "Égalité", 
      reason: "Prix identiques (aucune promotion active)" 
    };
  }

  const saving = Math.max(...totals.map(s => s.total)) - minTotal;
  return {
    bestStore: winners[0].name,
    reason: `Meilleur prix sans promotion (économie: $${saving.toFixed(2)})`
  };
}

// ========================================
// GÉNÉRATION DE MOTS-CLÉS
// ========================================

function generateSearchKeywords(productName: string): string[] {
  const keywords = new Set<string>();
  let normalized = productName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  keywords.add(normalized);
  
  const words = normalized
    .split(' ')
    .filter(w => w.length >= 3)
    .filter(w => !isCommonWord(w));
  
  words.forEach(w => keywords.add(w));
  
  if (words.length >= 2) {
    for (let i = 0; i < words.length - 1; i++) {
      keywords.add(`${words[i]} ${words[i + 1]}`);
    }
  }
  
  const synonymMap: Record<string, string[]> = {
    'lait': ['milk'],
    'oeuf': ['egg', 'eggs', 'œuf'],
    'œuf': ['oeuf', 'egg'],
    'pain': ['bread'],
    'fromage': ['cheese'],
    'poulet': ['chicken'],
    'boeuf': ['beef', 'bœuf'],
    'pomme': ['apple'],
    'banane': ['banana'],
    'riz': ['rice'],
    'légumes': ['vegetables', 'veggies'],
  };
  
  words.forEach(word => {
    if (synonymMap[word]) {
      synonymMap[word].forEach(syn => keywords.add(syn));
    }
  });
  
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
// RECHERCHE PROMOTIONS
// ========================================

async function searchPromotionsBatch(productNames: string[]): Promise<Map<string, any>> {
  console.log(`\n🔍 === RECHERCHE PROMOTIONS ===`);
  console.log(`   📋 Produits: ${productNames.length}`);
  
  const results = new Map<string, any>();
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
    const allKeywords = new Set<string>();
    const productKeywordMap = new Map<string, string[]>();
    
    uncachedProducts.forEach(product => {
      const keywords = generateSearchKeywords(product);
      productKeywordMap.set(product, keywords);
      keywords.forEach(kw => allKeywords.add(kw));
    });
    
    console.log(`   🔑 ${allKeywords.size} mots-clés uniques`);
    
    const today = new Date().toISOString().split('T')[0];
    const searchKeywords = Array.from(allKeywords).slice(0, 30);
    const orConditions = searchKeywords
      .map(keyword => `product_name.ilike.%${keyword}%`)
      .join(',');
    
    const { data: promotions, error } = await supabase
      .from("promotions")
      .select("*")
      .or(orConditions)
      .in("store_name", ["Walmart", "Metro", "Super C"])
      .gte("end_date", today)
      .not("old_price", "is", null)
      .gt("old_price", 0)
      .order("new_price", { ascending: true })
      .limit(200);
    
    if (error) {
      console.error('   ❌ Erreur Supabase:', error);
      return createEmptyResults(uncachedProducts, results);
    }
    
    console.log(`   ✅ ${promotions?.length || 0} promotions trouvées`);
    
    if (!promotions || promotions.length === 0) {
      console.log(`   ℹ️ Aucune promotion active`);
      return createEmptyResults(uncachedProducts, results);
    }
    
    console.log(`   🎯 Démarrage du matching...`);
    const batchMatches = batchMatchProducts(uncachedProducts, promotions, 'flexible');
    
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
      PriceCache.set(cacheKey, result, 1800000);
      results.set(product, result);
    }
    
    console.log(`   📊 Résultat: ${matchesFound}/${uncachedProducts.length} avec promotions`);
  } catch (error) {
    console.error('   ❌ Erreur recherche:', error);
    return createEmptyResults(uncachedProducts, results);
  }
  
  return results;
}

function createEmptyResults(products: string[], existingResults: Map<string, any>): Map<string, any> {
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
// PRÉPARATION DES DONNÉES
// ========================================

async function prepareComparisonData(productMatches: Map<string, any>, originalProducts: string[]) {
  console.log(`\n📊 === PRÉPARATION DES DONNÉES ===`);
  const standardizedMatches: ProductMatch[] = [];

  for (const [productName, matchData] of productMatches.entries()) {
    const matches = matchData.matches || [];

    const walmartMatches = matches.filter((m: any) => m.store === "Walmart");
    const metroMatches = matches.filter((m: any) => m.store === "Metro");
    const supercMatches = matches.filter((m: any) => m.store === "Super C");

    const getPromotionDetails = async (match: any) => {
      if (!match) return null;

      const { data } = await supabase
        .from("promotions")
        .select("old_price, new_price")
        .eq("product_name", match.matchedName)
        .eq("store_name", match.store)
        .not("old_price", "is", null)
        .single();

      return data;
    };

    const buildStoreMatch = async (match: any): Promise<StoreMatch> => {
      if (!match) {
        return { found: false, hasPromotion: false };
      }

      const promoDetails = await getPromotionDetails(match);
      const regularPrice = promoDetails?.old_price || match.price;
      const promoPrice = match.price;
      const hasPromotion = regularPrice > promoPrice;
      const savings = hasPromotion ? regularPrice - promoPrice : 0;
      const discount = hasPromotion ? Math.round((savings / regularPrice) * 100) : 0;

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

    const [walmartMatch, metroMatch, supercMatch] = await Promise.all([
      buildStoreMatch(walmartMatches[0]),
      buildStoreMatch(metroMatches[0]),
      buildStoreMatch(supercMatches[0])
    ]);

    const prices = [
      { store: "Walmart" as const, price: walmartMatch.price, discount: walmartMatch.discount || 0 },
      { store: "Metro" as const, price: metroMatch.price, discount: metroMatch.discount || 0 },
      { store: "Super C" as const, price: supercMatch.price, discount: supercMatch.discount || 0 }
    ].filter(p => p.price !== undefined) as Array<{ store: StoreName; price: number; discount: number }>;

    let bestStore: StoreName | null = null;
    let bestPrice: number | null = null;
    let bestDiscount: number | null = null;
    let savings = 0;

    if (prices.length > 0) {
      prices.sort((a, b) => a.price - b.price);
      bestStore = prices[0].store;
      bestPrice = prices[0].price;
      bestDiscount = prices[0].discount;
      savings = prices.length > 1 ? prices[prices.length - 1].price - prices[0].price : 0;
    }

    const matchQuality = calculateMatchQuality(walmartMatch, metroMatch, supercMatch);
    const hasPromotion = walmartMatch.hasPromotion || metroMatch.hasPromotion || supercMatch.hasPromotion;

    standardizedMatches.push({
      originalProduct: productName,
      walmart: walmartMatch,
      metro: metroMatch,
      superc: supercMatch,
      bestStore,
      bestPrice,
      bestDiscount,
      savings: Math.round(savings * 100) / 100,
      matchQuality,
      hasPromotion
    });
  }

  const totals = calculateTotalsWithPromotions(standardizedMatches, originalProducts.length);

  return {
    summary: totals,
    comparisons: standardizedMatches,
    statistics: {
      totalProducts: originalProducts.length,
      productsWithPromotions: standardizedMatches.filter(m => m.hasPromotion).length,
      productsWithoutPromotions: standardizedMatches.filter(m => !m.hasPromotion).length,
      promotionRate: ((standardizedMatches.filter(m => m.hasPromotion).length / originalProducts.length) * 100).toFixed(1) + '%'
    }
  };
}

function calculateMatchQuality(walmart: StoreMatch, metro: StoreMatch, superc: StoreMatch): 'excellent' | 'good' | 'fair' | 'poor' {
  const similarities = [walmart?.similarity || 0, metro?.similarity || 0, superc?.similarity || 0];
  const maxSimilarity = Math.max(...similarities);
  if (maxSimilarity >= 0.7) return 'excellent';
  if (maxSimilarity >= 0.5) return 'good';
  if (maxSimilarity >= 0.3) return 'fair';
  return 'poor';
}

// ========================================
// CALCUL DES TOTAUX - VERSION CORRIGÉE
// ========================================

function calculateTotalsWithPromotions(matches: ProductMatch[], totalProductsSearched: number): ComparisonSummary {
  let totalWalmart = 0, totalMetro = 0, totalSuperC = 0;
  let regularTotalWalmart = 0, regularTotalMetro = 0, regularTotalSuperC = 0;
  let promoTotalWalmart = 0, promoTotalMetro = 0, promoTotalSuperC = 0;
  let productsFoundWalmart = 0, productsFoundMetro = 0, productsFoundSuperC = 0;
  let promotionsFoundWalmart = 0, promotionsFoundMetro = 0, promotionsFoundSuperC = 0;

  // 🔥 NOUVEAU: Compter les produits uniques trouvés
  const uniqueProductsFound = new Set<string>();

  matches.forEach(match => {
    // Compter le produit unique s'il est trouvé dans au moins un magasin
    if (match.walmart.found || match.metro.found || match.superc.found) {
      uniqueProductsFound.add(match.originalProduct);
    }

    if (match.walmart.found && match.walmart.price) {
      totalWalmart += match.walmart.price;
      regularTotalWalmart += match.walmart.regularPrice || match.walmart.price;
      productsFoundWalmart++;
      if (match.walmart.hasPromotion) {
        promotionsFoundWalmart++;
        promoTotalWalmart += match.walmart.price;
      }
    }
    if (match.metro.found && match.metro.price) {
      totalMetro += match.metro.price;
      regularTotalMetro += match.metro.regularPrice || match.metro.price;
      productsFoundMetro++;
      if (match.metro.hasPromotion) {
        promotionsFoundMetro++;
        promoTotalMetro += match.metro.price;
      }
    }
    if (match.superc.found && match.superc.price) {
      totalSuperC += match.superc.price;
      regularTotalSuperC += match.superc.regularPrice || match.superc.price;
      productsFoundSuperC++;
      if (match.superc.hasPromotion) {
        promotionsFoundSuperC++;
        promoTotalSuperC += match.superc.price;
      }
    }
  });

  const totalSavingsWalmart = regularTotalWalmart - totalWalmart;
  const totalSavingsMetro = regularTotalMetro - totalMetro;
  const totalSavingsSuperC = regularTotalSuperC - totalSuperC;

  const { bestStore, reason } = determineBestStoreIntelligent(
    { promos: promotionsFoundWalmart, promoTotal: promoTotalWalmart, total: totalWalmart },
    { promos: promotionsFoundMetro, promoTotal: promoTotalMetro, total: totalMetro },
    { promos: promotionsFoundSuperC, promoTotal: promoTotalSuperC, total: totalSuperC }
  );

  const totals = [totalWalmart, totalMetro, totalSuperC].filter(t => t > 0);
  const minTotal = totals.length > 0 ? Math.min(...totals) : 0;
  const maxTotal = totals.length > 0 ? Math.max(...totals) : 0;
  const totalSavings = maxTotal - minTotal;
  const totalPromotionalSavings = totalSavingsWalmart + totalSavingsMetro + totalSavingsSuperC;

  // 🔥 NOUVEAU: Total de toutes les promotions trouvées (somme des promos de chaque magasin)
  const totalPromotionsCount = promotionsFoundWalmart + promotionsFoundMetro + promotionsFoundSuperC;

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
    productsFound: uniqueProductsFound.size, // 🔥 CORRIGÉ: Nombre de produits uniques trouvés
    productsFoundWalmart,
    productsFoundMetro,
    productsFoundSuperC,
    promotionsFoundWalmart,
    promotionsFoundMetro,
    promotionsFoundSuperC,
    totalPromotionsCount, // 🔥 NOUVEAU
    bestStore,
    bestStoreReason: reason,
    totalSavings: Math.round(totalSavings * 100) / 100,
    savingsPercentage: maxTotal > 0 ? Math.round((totalSavings / maxTotal) * 100) : 0,
    totalPromotionalSavings: Math.round(totalPromotionalSavings * 100) / 100,
    totalProducts: totalProductsSearched // 🔥 CORRIGÉ: Utilise le nombre de produits recherchés
  };
}

// ========================================
// ANALYSE - VERSION CORRIGÉE
// ========================================

function generatePromotionalAnalysis(comparisonData: any): string {
  const { summary, comparisons, statistics } = comparisonData;

  if (statistics.productsWithPromotions === 0) {
    return `🔍 **Aucune promotion trouvée**\n\n❌ Désolé, aucun de vos produits n'est actuellement en promotion chez Walmart, Metro ou Super C.\n\n💡 **Suggestions :**\n• Vérifiez les circulaires directement en magasin\n• Essayez avec des termes plus génériques\n• Les promotions changent chaque semaine\n\n🛒 **Astuce :** Ajoutez vos produits à une liste et relancez la comparaison la semaine prochaine !`;
  }

  let analysis = `🎉 **Analyse des promotions : ${statistics.productsWithPromotions}/${statistics.totalProducts} produits**\n\n`;

  if (summary.bestStore !== "Égalité") {
    analysis += `🏆 **MEILLEUR CHOIX : ${summary.bestStore}**\n📊 ${summary.bestStoreReason}\n\n`;
  } else {
    analysis += `⚖️ **PRIX IDENTIQUES**\n📊 ${summary.bestStoreReason}\n💡 Vous pouvez choisir selon votre proximité ou préférence personnelle.\n\n`;
  }

  analysis += `**📊 Comparaison complète :**\n\n`;

  const stores = [
    { name: '🏪 Walmart', promos: summary.promotionsFoundWalmart, total: summary.totalWalmart, savings: summary.totalSavingsWalmart },
    { name: '🏪 Metro', promos: summary.promotionsFoundMetro, total: summary.totalMetro, savings: summary.totalSavingsMetro },
    { name: '🏪 Super C', promos: summary.promotionsFoundSuperC, total: summary.totalSuperC, savings: summary.totalSavingsSuperC }
  ];

  stores.forEach(store => {
    if (store.promos > 0 || store.total > 0) {
      const isBest = summary.bestStore !== "Égalité" && store.name.includes(summary.bestStore);
      const badge = isBest ? ' 🏅' : '';
      analysis += `${store.name}${badge}:\n   • Prix total: $${store.total.toFixed(2)}\n   • Promotions: ${store.promos} produit${store.promos > 1 ? 's' : ''}\n`;
      if (store.savings > 0) analysis += `   • Économie vs prix régulier: $${store.savings.toFixed(2)}\n`;
      analysis += `\n`;
    }
  });

  // 🔥 CORRIGÉ: Affichage des totaux
  analysis += `📦 **Produits trouvés:** ${summary.productsFound}/${summary.totalProducts}\n`;
  analysis += `🎉 **Total promotions:** ${summary.totalPromotionsCount} sur ${summary.totalProducts} produits recherchés\n\n`;

  if (summary.totalSavings > 0 && summary.bestStore !== "Égalité") {
    analysis += `💰 **Économie en choisissant ${summary.bestStore} : $${summary.totalSavings.toFixed(2)}**\n\n`;
  }

  const productsWithPromos = comparisons.filter((c: any) => c.hasPromotion);
  if (productsWithPromos.length > 0) {
    analysis += `**✅ Produits en promotion trouvés :**\n\n`;
    productsWithPromos.forEach((product: any, idx: number) => {
      analysis += `${idx + 1}. **${product.originalProduct}**\n`;
      
      const promoDetails = [];
      if (product.walmart.hasPromotion) {
        promoDetails.push({
          store: 'Walmart',
          name: product.walmart.productName,
          price: product.walmart.price,
          regular: product.walmart.regularPrice,
          discount: product.walmart.discount
        });
      }
      if (product.metro.hasPromotion) {
        promoDetails.push({
          store: 'Metro',
          name: product.metro.productName,
          price: product.metro.price,
          regular: product.metro.regularPrice,
          discount: product.metro.discount
        });
      }
      if (product.superc.hasPromotion) {
        promoDetails.push({
          store: 'Super C',
          name: product.superc.productName,
          price: product.superc.price,
          regular: product.superc.regularPrice,
          discount: product.superc.discount
        });
      }

      promoDetails.forEach(promo => {
        analysis += `   • ${promo.store}: **${promo.name}**\n`;
        analysis += `     Prix: ${promo.price?.toFixed(2)}$ (rég. ${promo.regular?.toFixed(2)}$) • Rabais: ${promo.discount}%\n`;
      });
      
      analysis += `\n`;
    });
  }

  analysis += `💡 **Conseil :**\n`;
  if (summary.bestStore !== "Égalité") {
    analysis += `Faites vos courses chez ${summary.bestStore} pour maximiser vos économies !\n`;
  } else {
    analysis += `Les prix sont similaires - choisissez le magasin le plus proche de vous.\n`;
  }
  
  if (summary.totalPromotionalSavings > 5) {
    analysis += `Vous économisez $${summary.totalPromotionalSavings.toFixed(2)} vs les prix réguliers.\n`;
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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Veuillez fournir une liste de produits valide" }, { status: 400 });
    }

    const cleanItems = items
      .map(item => (typeof item === 'string' ? item.trim() : String(item)))
      .filter(item => item.length >= 2 && item.length <= 100)
      .slice(0, 50);

    if (cleanItems.length === 0) {
      return NextResponse.json({ error: "Aucun produit valide fourni" }, { status: 400 });
    }

    console.log(`\n🛒 === COMPARAISON PROMOTIONS ===`);
    console.log(`   📋 Produits: ${cleanItems.length}`);

    const productMatches = await searchPromotionsBatch(cleanItems);
    const comparisonData = await prepareComparisonData(productMatches, cleanItems);

    let analysis = "";
    const shouldUseAI = options.enableAI !== false && comparisonData.statistics.productsWithPromotions > 0;

    if (shouldUseAI) {
      try {
        analysis = await AIPriceService.generateSmartAnalysis(comparisonData, cleanItems);
      } catch (error) {
        console.warn("   ⚠️ Erreur IA, utilisation du fallback");
        analysis = generatePromotionalAnalysis(comparisonData);
      }
    } else {
      analysis = generatePromotionalAnalysis(comparisonData);
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ === RÉSULTATS ===`);
    console.log(`   🏆 Meilleur: ${comparisonData.summary.bestStore}`);
    console.log(`   📊 Raison: ${comparisonData.summary.bestStoreReason}`);
    console.log(`   💰 Économie: ${comparisonData.summary.totalSavings.toFixed(2)}`);
    console.log(`   📦 Produits trouvés: ${comparisonData.summary.productsFound}/${comparisonData.summary.totalProducts}`);
    console.log(`   🎉 Total promotions: ${comparisonData.summary.totalPromotionsCount}`);

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
        recommendation: comparisonData.summary.bestStoreReason
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

      const { count: totalCount } = await supabase
        .from("promotions")
        .select("*", { count: 'exact', head: true });

      const { count: activeCount } = await supabase
        .from("promotions")
        .select("*", { count: 'exact', head: true })
        .gte("end_date", today);

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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: "API de comparaison de prix promotionnels",
    version: "2.1 - CORRIGÉE",
    features: [
      "🔥 Recherche exacte prioritaire (correspondance exacte > contient > fuzzy)",
      "✅ Calculs corrigés: produits uniques trouvés vs total recherché",
      "📊 Total promotions: somme de toutes les promos des 3 magasins",
      "🎯 Logique optimisée: nombre de promos > prix promos > prix total"
    ],
    endpoints: {
      POST: "/api/compare - Compare les prix promotionnels",
      GET: "/api/compare?action=diagnostic - Diagnostic de la base"
    }
  });
}