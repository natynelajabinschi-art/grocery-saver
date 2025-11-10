// app/api/flyers/route.ts
/**
 * Endpoint pour récupérer et stocker les promotions des circulaires
 * Magasins: Walmart, Metro, Super C
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchFlippPromotions } from "@/lib/flyers";
import { storePromotions, cleanupExpiredPromotions } from "@/lib/storePromotions";
import { supabase } from "@/lib/supabaseClient";

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  stores: ["Walmart", "Metro", "Super C"] as const,
  postalCode: "H2S0B8", // Montréal (ajustez selon votre région)
  maxPromoPerCategory: 15 // Nombre de produits par catégorie
};

// ========================================
// VÉRIFICATION D'IMPORT
// ========================================

/**
 * Vérifie si les promotions ont déjà été importées aujourd'hui
 */
async function hasImportedToday(): Promise<{
  hasImported: boolean;
  count?: number;
  date?: string;
}> {
  const today = new Date().toISOString().slice(0, 10);

  const { count, error } = await supabase
    .from("promotions")
    .select('*', { count: 'exact', head: true })
    .eq('start_date', today);

  if (error) {
    console.error("❌ Erreur vérification import:", error);
    return { hasImported: false };
  }

  return {
    hasImported: (count || 0) > 0,
    count,
    date: today
  };
}

/**
 * Obtient les statistiques des promotions actuelles
 */
async function getCurrentStats() {
  const today = new Date().toISOString().slice(0, 10);

  const stats: Record<string, number> = {};

  for (const store of CONFIG.stores) {
    const { count } = await supabase
      .from("promotions")
      .select('*', { count: 'exact', head: true })
      .eq('store_name', store)
      .gte('end_date', today);

    stats[store] = count || 0;
  }

  return stats;
}

// ========================================
// HANDLER GET - Export nommé requis
// ========================================

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  console.log(`\n🎯 === IMPORT DES CIRCULAIRES ===`);
  console.log(`   📅 Date: ${new Date().toISOString().slice(0, 10)}`);
  console.log(`   🏪 Magasins: ${CONFIG.stores.join(', ')}`);

  try {
    // Étape 1: Vérifier si déjà importé aujourd'hui
    const importCheck = await hasImportedToday();

    if (importCheck.hasImported) {
      const stats = await getCurrentStats();
      
      console.log(`\n✅ Import déjà effectué aujourd'hui`);
      console.log(`   📊 Promotions actuelles:`);
      Object.entries(stats).forEach(([store, count]) => {
        console.log(`      - ${store}: ${count}`);
      });

      return NextResponse.json({
        success: true,
        message: `📅 Import déjà effectué aujourd'hui (${importCheck.date})`,
        existingCount: importCheck.count,
        byStore: stats,
        advice: "Les promotions sont à jour. Réessayez demain pour de nouvelles promotions."
      });
    }

    // Étape 2: Nettoyer les anciennes promotions
    console.log(`\n🧹 Nettoyage des promotions expirées...`);
    const deletedCount = await cleanupExpiredPromotions();
    console.log(`   ✅ ${deletedCount} promotions expirées supprimées`);

    // Étape 3: Récupérer les nouvelles promotions
    const results = [];
    let totalPromotions = 0;
    let totalInserted = 0;
    let totalErrors = 0;

    for (const store of CONFIG.stores) {
      console.log(`\n🔍 === TRAITEMENT ${store.toUpperCase()} ===`);

      try {
        // Récupérer les promotions
        const promotions = await fetchFlippPromotions(
          store,
          CONFIG.postalCode,
          CONFIG.maxPromoPerCategory
        );

        if (promotions.length > 0) {
          console.log(`   ✅ ${promotions.length} promotions trouvées`);

          // Stocker en base
          const saveResult = await storePromotions(promotions);

          totalPromotions += promotions.length;
          totalInserted += saveResult.inserted;
          totalErrors += saveResult.errors;

          results.push({
            store,
            status: "success",
            promotionsFound: promotions.length,
            inserted: saveResult.inserted,
            duplicates: saveResult.duplicates,
            errors: saveResult.errors
          });

          console.log(`   💾 ${saveResult.inserted} insertions réussies`);
          console.log(`   ♻️ ${saveResult.duplicates} doublons évités`);
          if (saveResult.errors > 0) {
            console.log(`   ⚠️ ${saveResult.errors} erreurs`);
          }
        } else {
          console.log(`   ⚠️ Aucune promotion trouvée`);

          results.push({
            store,
            status: "no_promotions",
            promotionsFound: 0,
            message: "Aucune promotion trouvée dans les circulaires"
          });
        }

        // Pause entre les magasins
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (storeError: any) {
        console.error(`   ❌ Erreur pour ${store}:`, storeError.message);

        results.push({
          store,
          status: "error",
          error: storeError.message
        });
      }
    }

    const duration = Date.now() - startTime;

    // Statistiques finales
    const finalStats = await getCurrentStats();

    console.log(`\n✅ === IMPORT TERMINÉ ===`);
    console.log(`   ⏱️ Durée: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   📦 Total trouvé: ${totalPromotions}`);
    console.log(`   💾 Total inséré: ${totalInserted}`);
    console.log(`   ⚠️ Total erreurs: ${totalErrors}`);
    console.log(`   📊 Base actuelle:`);
    Object.entries(finalStats).forEach(([store, count]) => {
      console.log(`      - ${store}: ${count}`);
    });

    return NextResponse.json({
      success: true,
      date: new Date().toISOString().slice(0, 10),
      summary: {
        totalStores: CONFIG.stores.length,
        storesProcessed: results.filter(r => r.status === "success").length,
        totalPromotionsFound: totalPromotions,
        totalInserted: totalInserted,
        totalErrors: totalErrors,
        duration: `${(duration / 1000).toFixed(2)}s`
      },
      results,
      currentDatabase: finalStats
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error(`\n❌ ERREUR GLOBALE (${duration}ms):`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des promotions",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ========================================
// HANDLER POST - Import forcé - Export nommé requis
// ========================================

export async function POST(req: NextRequest) {
  console.log(`\n🔄 === IMPORT FORCÉ ===`);

  try {
    const body = await req.json();
    const { force = false } = body;

    if (!force) {
      return NextResponse.json(
        {
          error: "Veuillez confirmer l'import forcé avec { force: true }"
        },
        { status: 400 }
      );
    }

    // Nettoyer toutes les promotions actuelles
    console.log(`   🧹 Suppression de toutes les promotions...`);
    const { error: deleteError } = await supabase
      .from("promotions")
      .delete()
      .neq('id', 0); // Supprimer tout

    if (deleteError) {
      throw deleteError;
    }

    console.log(`   ✅ Base nettoyée`);

    // Relancer l'import
    return GET(req);
  } catch (error: any) {
    console.error(`   ❌ Erreur import forcé:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'import forcé",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}