// app/api/compare/route.ts - VERSION COMPLÈTE AVEC IA
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
}

/**
 * Recherche intelligente avec matching de similarité
 */
async function searchProductsWithMatching(productNames: string[]): Promise<ProductMatch[]> {
  const results: ProductMatch[] = [];

  for (const productName of productNames) {
    const cacheKey = `product_${productName.toLowerCase()}`;
    
    // Vérifier le cache
    const cached = PriceCache.get(cacheKey);
    if (cached) {
      console.log(`⚡ Cache hit: ${productName}`);
      results.push(cached);
      continue;
    }

    console.log(`🔍 Recherche intelligente: "${productName}"`);

    // Générer des variantes de recherche
    const searchVariants = ProductMatcher.generateSearchVariants(productName);
    console.log(`   Variantes: ${searchVariants.join(', ')}`);

    try {
      // Recherche large dans la base
      const { data: promotions, error } = await supabase
        .from("promotions")
        .select("*")
        .or(searchVariants.map(v => `product_name.ilike.%${v}%`).join(','))
        .in("store_name", ["IGA", "Metro"])
        .gte("end_date", new Date().toISOString().split('T')[0])
        .order("new_price", { ascending: true })
        .limit(50);

      if (error) {
        console.error(`❌ Erreur DB: ${error.message}`);
        results.push(createEmptyMatch(productName));
        continue;
      }

      if (!promotions || promotions.length === 0) {
        console.log(`   ❌ Aucun résultat`);
        results.push(createEmptyMatch(productName));
        continue;
      }

      console.log(`   📦 ${promotions.length} candidats trouvés`);

      // Séparer par magasin
      const igaProducts = promotions.filter(p => p.store_name === "IGA");
      const metroProducts = promotions.filter(p => p.store_name === "Metro");

      // Trouver le meilleur match pour chaque magasin
      const igaMatch = ProductMatcher.findBestMatch(productName, igaProducts);
      const metroMatch = ProductMatcher.findBestMatch(productName, metroProducts);

      // Créer le résultat
      const match = createProductMatch(
        productName,
        igaMatch ? igaProducts.find(p => p.product_name === igaMatch.matchedName) : null,
        metroMatch ? metroProducts.find(p => p.product_name === metroMatch.matchedName) : null,
        igaMatch,
        metroMatch
      );

      // Afficher les matches trouvés
      if (igaMatch) {
        console.log(`   ✅ IGA: ${igaMatch.matchedName} (${(igaMatch.similarity * 100).toFixed(0)}% - ${igaMatch.confidence})`);
      }
      if (metroMatch) {
        console.log(`   ✅ Metro: ${metroMatch.matchedName} (${(metroMatch.similarity * 100).toFixed(0)}% - ${metroMatch.confidence})`);
      }

      // Mettre en cache
      PriceCache.set(cacheKey, match);
      results.push(match);

    } catch (error) {
      console.error(`❌ Erreur recherche ${productName}:`, error);
      results.push(createEmptyMatch(productName));
    }
  }

  return results;
}

function createEmptyMatch(productName: string): ProductMatch {
  return {
    originalProduct: productName,
    iga: { found: false },
    metro: { found: false },
    bestStore: null,
    bestPrice: null,
    savings: 0
  };
}

function createProductMatch(
  originalProduct: string,
  igaPromo: any,
  metroPromo: any,
  igaMatch: any,
  metroMatch: any
): ProductMatch {
  const hasIga = igaPromo !== null;
  const hasMetro = metroPromo !== null;

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
    savings: Math.round(savings * 100) / 100
  };
}

/**
 * Prépare les données pour l'IA
 */
function prepareDataForAI(matches: ProductMatch[]) {
  const totalIga = matches
    .filter(m => m.iga.found)
    .reduce((sum, m) => sum + (m.iga.price || 0), 0);

  const totalMetro = matches
    .filter(m => m.metro.found)
    .reduce((sum, m) => sum + (m.metro.price || 0), 0);

  const productsFoundIga = matches.filter(m => m.iga.found).length;
  const productsFoundMetro = matches.filter(m => m.metro.found).length;
  const productsFound = matches.filter(m => m.iga.found || m.metro.found).length;
  const totalProducts = matches.length;
  const totalSavings = matches.reduce((sum, m) => sum + m.savings, 0);

  const detailedComparison = matches.map(match => ({
    product: match.originalProduct,
    iga: match.iga.found ? {
      price: match.iga.price,
      hasPromotion: match.iga.hasPromotion,
      productName: match.iga.productName
    } : null,
    metro: match.metro.found ? {
      price: match.metro.price,
      hasPromotion: match.metro.hasPromotion,
      productName: match.metro.productName
    } : null,
    bestStore: match.bestStore,
    bestPrice: match.bestPrice,
    savings: match.savings
  }));

  return {
    summary: {
      totalIga: Math.round(totalIga * 100) / 100,
      totalMetro: Math.round(totalMetro * 100) / 100,
      productsFound,
      productsFoundIga,
      productsFoundMetro,
      totalProducts,
      bestStore: totalIga < totalMetro ? "IGA" : "Metro",
      savings: Math.abs(totalIga - totalMetro),
      totalSavings: Math.round(totalSavings * 100) / 100,
      priceDifference: Math.abs(totalIga - totalMetro),
      hasData: totalIga > 0 || totalMetro > 0
    },
    detailedComparison
  };
}

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: "Veuillez fournir une liste de produits" 
      }, { status: 400 });
    }

    console.log(`\n🤖 COMPARAISON INTELLIGENTE: ${items.join(', ')}`);

    // Recherche avec matching intelligent
    const matches = await searchProductsWithMatching(items);

    // Préparer les données
    const comparisonData = prepareDataForAI(matches);

    console.log(`📊 Données: IGA=$${comparisonData.summary.totalIga}, Metro=$${comparisonData.summary.totalMetro}`);

    // Générer l'analyse IA
    let aiAnalysis = "";
    try {
      aiAnalysis = await AIPriceService.generateSmartAnalysis(comparisonData, items);
      console.log("✅ Analyse IA générée avec succès");
    } catch (error) {
      console.error("⚠️ Erreur IA, utilisation de l'analyse simple:", error);
      aiAnalysis = generateFallbackAnalysis(comparisonData);
    }

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
      summary: comparisonData.summary,
      matches: matches,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Erreur API compare:", error);
    return NextResponse.json({ 
      success: false,
      error: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}

/**
 * Analyse de secours si l'IA échoue
 */
function generateFallbackAnalysis(comparisonData: any): string {
  const { summary } = comparisonData;

  if (!summary.hasData || summary.productsFound === 0) {
    return "❌ Aucune promotion trouvée pour ces produits. Essayez avec des termes plus génériques.";
  }

  let analysis = `🛒 **Meilleur choix: ${summary.bestStore}**\n\n`;
  analysis += `💰 Économie: $${summary.savings.toFixed(2)}\n`;
  analysis += `📦 Produits en promotion: ${summary.productsFound}/${summary.totalProducts}\n\n`;
  
  if (summary.savings > 5) {
    analysis += `💡 Excellente opportunité d'économie!\n`;
  } else if (summary.savings > 0) {
    analysis += `💡 Bonne économie possible.\n`;
  } else {
    analysis += `💡 Prix identiques, choisissez selon votre proximité.\n`;
  }

  return analysis;
}

// GET endpoint pour tests
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