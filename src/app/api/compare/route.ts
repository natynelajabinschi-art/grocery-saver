// app/api/compare/route.ts - VERSION OPTIMISÉE AVEC PRÉCISION ACCRUE
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { ProductMatcher } from "@/lib/productMatcher";
import { PriceCache } from "@/lib/priceCalculator";
import { AIPriceService } from "@/lib/openaiClient";

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
  };
  metro: {
    found: boolean;
    productName?: string;
    price?: number;
    oldPrice?: number;
    similarity?: number;
    confidence?: string;
    hasPromotion?: boolean;
  };
  bestStore: "IGA" | "Metro" | null;
  bestPrice: number | null;
  savings: number;
  matchQuality: 'excellent' | 'good' | 'fair' | 'poor'; // Nouveau
}

/**
 * Recherche MULTI-STRATÉGIES pour précision maximale
 */
async function searchProductsWithMultiStrategy(productNames: string[]): Promise<ProductMatch[]> {
  const results: ProductMatch[] = [];

  for (const productName of productNames) {
    const cacheKey = `product_v2_${productName.toLowerCase()}`;
    
    const cached = PriceCache.get(cacheKey);
    if (cached) {
      console.log(`⚡ Cache: ${productName}`);
      results.push(cached);
      continue;
    }

    console.log(`\n🔍 Recherche: "${productName}"`);

    try {
      // Stratégie 1: Recherche exacte
      let promotions = await searchExact(productName);
      
      // Stratégie 2: Si pas de résultat, recherche fuzzy
      if (promotions.length === 0) {
        console.log('   🔄 Recherche élargie...');
        promotions = await searchFuzzy(productName);
      }

      // Stratégie 3: Si toujours rien, recherche par mots-clés
      if (promotions.length === 0) {
        console.log('   🔄 Recherche par mots-clés...');
        promotions = await searchByKeywords(productName);
      }

      if (promotions.length === 0) {
        console.log(`   ❌ Aucun résultat`);
        results.push(createEmptyMatch(productName));
        continue;
      }

      console.log(`   📦 ${promotions.length} candidats`);

      // Séparer par magasin
      const igaProducts = promotions.filter(p => p.store_name === "IGA");
      const metroProducts = promotions.filter(p => p.store_name === "Metro");

      // Matcher avec score de confiance
      const igaMatch = ProductMatcher.findBestMatch(productName, igaProducts);
      const metroMatch = ProductMatcher.findBestMatch(productName, metroProducts);

      // Créer le match avec qualité
      const match = createProductMatch(
        productName,
        igaMatch ? igaProducts.find(p => p.product_name === igaMatch.matchedName) : null,
        metroMatch ? metroProducts.find(p => p.product_name === metroMatch.matchedName) : null,
        igaMatch,
        metroMatch
      );

      // Log des matches
      if (igaMatch) {
        console.log(`   ✅ IGA: ${igaMatch.matchedName} (${(igaMatch.similarity * 100).toFixed(0)}% - ${igaMatch.confidence})`);
      }
      if (metroMatch) {
        console.log(`   ✅ Metro: ${metroMatch.matchedName} (${(metroMatch.similarity * 100).toFixed(0)}% - ${metroMatch.confidence})`);
      }

      PriceCache.set(cacheKey, match);
      results.push(match);

    } catch (error) {
      console.error(`❌ Erreur: ${productName}`, error);
      results.push(createEmptyMatch(productName));
    }
  }

  return results;
}

/**
 * Recherche EXACTE (priorité haute)
 */
async function searchExact(productName: string): Promise<any[]> {
  const normalized = productName.toLowerCase().trim();
  
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .ilike("product_name", `%${normalized}%`)
    .in("store_name", ["IGA", "Metro"])
    .gte("end_date", new Date().toISOString().split('T')[0])
    .order("new_price", { ascending: true })
    .limit(20);

  if (error) throw error;
  return data || [];
}

/**
 * Recherche FUZZY (similarité flexible)
 */
async function searchFuzzy(productName: string): Promise<any[]> {
  const variants = ProductMatcher.generateSearchVariants(productName);
  
  const orConditions = variants
    .map(v => `product_name.ilike.%${v}%`)
    .join(',');

  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .or(orConditions)
    .in("store_name", ["IGA", "Metro"])
    .gte("end_date", new Date().toISOString().split('T')[0])
    .order("new_price", { ascending: true })
    .limit(40);

  if (error) throw error;
  return data || [];
}

/**
 * Recherche par MOTS-CLÉS (dernière tentative)
 */
async function searchByKeywords(productName: string): Promise<any[]> {
  const keywords = ProductMatcher.extractKeywords(productName);
  
  if (keywords.length === 0) return [];

  const mainKeyword = keywords[0];
  
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .ilike("product_name", `%${mainKeyword}%`)
    .in("store_name", ["IGA", "Metro"])
    .gte("end_date", new Date().toISOString().split('T')[0])
    .order("new_price", { ascending: true })
    .limit(30);

  if (error) throw error;
  return data || [];
}

/**
 * Créer un match vide
 */
function createEmptyMatch(productName: string): ProductMatch {
  return {
    originalProduct: productName,
    iga: { found: false },
    metro: { found: false },
    bestStore: null,
    bestPrice: null,
    savings: 0,
    matchQuality: 'poor'
  };
}

/**
 * Créer un match avec QUALITÉ évaluée
 */
function createProductMatch(
  originalProduct: string,
  igaPromo: any,
  metroPromo: any,
  igaMatch: any,
  metroMatch: any
): ProductMatch {
  const hasIga = igaPromo !== null;
  const hasMetro = metroPromo !== null;

  // Déterminer le meilleur magasin
  let bestStore: "IGA" | "Metro" | null = null;
  let bestPrice: number | null = null;
  let savings = 0;

  if (hasIga && hasMetro) {
    if (igaPromo.new_price < metroPromo.new_price) {
      bestStore = "IGA";
      bestPrice = igaPromo.new_price;
      savings = metroPromo.new_price - igaPromo.new_price;
    } else if (metroPromo.new_price < igaPromo.new_price) {
      bestStore = "Metro";
      bestPrice = metroPromo.new_price;
      savings = igaPromo.new_price - metroPromo.new_price;
    } else {
      bestStore = "IGA";
      bestPrice = igaPromo.new_price;
    }
  } else if (hasIga) {
    bestStore = "IGA";
    bestPrice = igaPromo.new_price;
  } else if (hasMetro) {
    bestStore = "Metro";
    bestPrice = metroPromo.new_price;
  }

  // Évaluer la QUALITÉ du match
  let matchQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  const avgSimilarity = ((igaMatch?.similarity || 0) + (metroMatch?.similarity || 0)) / 2;
  
  if (avgSimilarity >= 0.85) matchQuality = 'excellent';
  else if (avgSimilarity >= 0.70) matchQuality = 'good';
  else if (avgSimilarity >= 0.55) matchQuality = 'fair';

  return {
    originalProduct,
    iga: hasIga ? {
      found: true,
      productName: igaPromo.product_name,
      price: igaPromo.new_price,
      oldPrice: igaPromo.old_price,
      similarity: igaMatch?.similarity,
      confidence: igaMatch?.confidence,
      hasPromotion: !!igaPromo.old_price && igaPromo.old_price > igaPromo.new_price
    } : { found: false },
    metro: hasMetro ? {
      found: true,
      productName: metroPromo.product_name,
      price: metroPromo.new_price,
      oldPrice: metroPromo.old_price,
      similarity: metroMatch?.similarity,
      confidence: metroMatch?.confidence,
      hasPromotion: !!metroPromo.old_price && metroPromo.old_price > metroPromo.new_price
    } : { found: false },
    bestStore,
    bestPrice,
    savings: Math.round(savings * 100) / 100,
    matchQuality
  };
}

/**
 * Préparer les données pour analyse IA ENRICHIE
 */
function prepareEnhancedDataForAI(matches: ProductMatch[]) {
  const foundMatches = matches.filter(m => m.iga.found || m.metro.found);
  
  const totalIga = foundMatches
    .filter(m => m.iga.found)
    .reduce((sum, m) => sum + (m.iga.price || 0), 0);

  const totalMetro = foundMatches
    .filter(m => m.metro.found)
    .reduce((sum, m) => sum + (m.metro.price || 0), 0);

  const productsFoundIga = matches.filter(m => m.iga.found).length;
  const productsFoundMetro = matches.filter(m => m.metro.found).length;
  const productsFound = foundMatches.length;
  const totalProducts = matches.length;
  const totalSavings = foundMatches.reduce((sum, m) => sum + m.savings, 0);

  // Stats de qualité
  const excellentMatches = matches.filter(m => m.matchQuality === 'excellent').length;
  const goodMatches = matches.filter(m => m.matchQuality === 'good').length;
  
  const promotionCount = foundMatches.filter(m => 
    m.iga.hasPromotion || m.metro.hasPromotion
  ).length;

  const detailedComparison = matches.map(match => ({
    product: match.originalProduct,
    iga: match.iga.found ? {
      price: match.iga.price,
      hasPromotion: match.iga.hasPromotion,
      productName: match.iga.productName,
      confidence: match.iga.confidence
    } : null,
    metro: match.metro.found ? {
      price: match.metro.price,
      hasPromotion: match.metro.hasPromotion,
      productName: match.metro.productName,
      confidence: match.metro.confidence
    } : null,
    bestStore: match.bestStore,
    bestPrice: match.bestPrice,
    savings: match.savings,
    matchQuality: match.matchQuality
  }));

  return {
    summary: {
      totalIga: Math.round(totalIga * 100) / 100,
      totalMetro: Math.round(totalMetro * 100) / 100,
      productsFound,
      productsFoundIga,
      productsFoundMetro,
      totalProducts,
      bestStore: totalIga <= totalMetro ? "IGA" : "Metro",
      savings: Math.abs(totalIga - totalMetro),
      totalSavings: Math.round(totalSavings * 100) / 100,
      priceDifference: Math.abs(totalIga - totalMetro),
      hasData: totalIga > 0 || totalMetro > 0,
      matchQuality: {
        excellent: excellentMatches,
        good: goodMatches,
        promotions: promotionCount
      }
    },
    detailedComparison
  };
}

/**
 * Endpoint POST principal
 */
export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: "Veuillez fournir une liste de produits" 
      }, { status: 400 });
    }

    // Nettoyer et valider
    const cleanItems = items
      .map(item => item.trim())
      .filter(item => item.length >= 2);

    if (cleanItems.length === 0) {
      return NextResponse.json({ 
        error: "Aucun produit valide fourni" 
      }, { status: 400 });
    }

    console.log(`\n🤖 COMPARAISON: ${cleanItems.join(', ')}`);

    // Recherche multi-stratégies
    const matches = await searchProductsWithMultiStrategy(cleanItems);

    // Préparer données enrichies
    const comparisonData = prepareEnhancedDataForAI(matches);

    console.log(`📊 IGA=$${comparisonData.summary.totalIga} | Metro=$${comparisonData.summary.totalMetro}`);
    console.log(`✨ Qualité: ${comparisonData.summary.matchQuality.excellent} excellent, ${comparisonData.summary.matchQuality.good} bons`);

    // Générer analyse IA
    let aiAnalysis = "";
    try {
      aiAnalysis = await AIPriceService.generateSmartAnalysis(comparisonData, cleanItems);
      console.log("✅ Analyse IA OK");
    } catch (error) {
      console.error("⚠️ Erreur IA:", error);
      aiAnalysis = generateEnhancedFallbackAnalysis(comparisonData);
    }

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
      summary: comparisonData.summary,
      matches: matches,
      metadata: {
        timestamp: new Date().toISOString(),
        cacheHitRate: PriceCache.getStats().size / cleanItems.length,
        averageMatchQuality: matches.reduce((sum, m) => {
          const quality = { excellent: 1, good: 0.75, fair: 0.5, poor: 0.25 };
          return sum + quality[m.matchQuality];
        }, 0) / matches.length
      }
    });

  } catch (error) {
    console.error("❌ Erreur API:", error);
    return NextResponse.json({ 
      success: false,
      error: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}

/**
 * Analyse de secours AMÉLIORÉE
 */
function generateEnhancedFallbackAnalysis(comparisonData: any): string {
  const { summary } = comparisonData;

  if (!summary.hasData || summary.productsFound === 0) {
    return "❌ **Aucune promotion trouvée**\n\nCes produits ne sont pas en promotion actuellement. Essayez:\n• Des termes plus génériques (ex: 'lait' au lieu de 'lait natrel')\n• D'autres produits similaires\n• Revenez demain pour de nouvelles promotions";
  }

  let analysis = `🎯 **Meilleur choix: ${summary.bestStore}**\n\n`;
  
  if (summary.savings > 10) {
    analysis += `💰 **Excellente économie: $${summary.savings.toFixed(2)}**\n`;
    analysis += `En magasinant chez ${summary.bestStore}, vous économiserez ${summary.savings.toFixed(2)}$ sur votre panier!\n\n`;
  } else if (summary.savings > 5) {
    analysis += `💰 **Bonne économie: $${summary.savings.toFixed(2)}**\n`;
    analysis += `${summary.bestStore} offre de meilleurs prix pour la majorité de vos produits.\n\n`;
  } else if (summary.savings > 0) {
    analysis += `💰 **Légère économie: $${summary.savings.toFixed(2)}**\n`;
    analysis += `Les prix sont similaires, mais ${summary.bestStore} reste légèrement moins cher.\n\n`;
  } else {
    analysis += `Les prix sont identiques dans les deux magasins. Choisissez selon votre proximité.\n\n`;
  }

  analysis += `📦 **Produits trouvés:** ${summary.productsFound}/${summary.totalProducts}\n`;
  
  if (summary.matchQuality.promotions > 0) {
    analysis += `🏷️ **${summary.matchQuality.promotions} promotion${summary.matchQuality.promotions > 1 ? 's' : ''} active${summary.matchQuality.promotions > 1 ? 's' : ''}!**\n`;
  }

  if (summary.productsFound < summary.totalProducts) {
    analysis += `\n⚠️ **Note:** Certains produits n'ont pas été trouvés. Essayez des termes plus génériques.`;
  }

  return analysis;
}

/**
 * Endpoint GET pour tests
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const itemsParam = searchParams.get('items');

  if (!itemsParam) {
    return NextResponse.json({ 
      error: "Paramètre 'items' requis (ex: ?items=lait,pain,fromage)" 
    }, { status: 400 });
  }

  const items = itemsParam.split(',').map(item => item.trim());
  
  const request = new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify({ items })
  });

  return POST(request);
}