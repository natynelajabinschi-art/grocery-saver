import { NextRequest, NextResponse } from "next/server";
import { fetchFlippPromotions } from "@/lib/flyers";
import { storePromotions, cleanupExpiredPromotions } from "@/lib/storePromotions";
import { supabase } from "@/lib/supabaseClient";

const CONFIG = {
  stores: ["Walmart", "Metro", "Super C"] as const,
  postalCode: "H2S0B8",
  maxPromoPerCategory: 100,
  minResultsThreshold: 3 // 🔹 Minimum de promos pour considérer que la récupération a marché
};

/** Vérifie si les promotions ont déjà été importées aujourd'hui */
async function hasImportedToday() {
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("promotions")
    .select("*", { count: "exact", head: true })
    .eq("start_date", today);

  if (error) {
    console.error("❌ Erreur vérification import:", error);
    return { hasImported: false };
  }

  return { hasImported: (count || 0) > 0, count, date: today };
}

/** Compte les promotions actives pour chaque magasin */
async function getCurrentStats() {
  const today = new Date().toISOString().slice(0, 10);
  const stats: Record<string, number> = {};

  await Promise.all(
    CONFIG.stores.map(async (store) => {
      const { count } = await supabase
        .from("promotions")
        .select("*", { count: "exact", head: true })
        .eq("store_name", store)
        .gte("end_date", today);
      stats[store] = count || 0;
    })
  );

  return stats;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  console.log(`\n🎯 IMPORT DES CIRCULAIRES (${new Date().toISOString().slice(0, 10)})`);

  try {
    // Étape 1 — Vérifie si l'import a déjà eu lieu aujourd'hui
    const importCheck = await hasImportedToday();
    /*if (importCheck.hasImported) {
      const stats = await getCurrentStats();
      console.log(`✅ Déjà importé aujourd'hui (${importCheck.date})`);
      return NextResponse.json({
        success: true,
        message: "Import déjà effectué aujourd'hui.",
        byStore: stats
      });
    }*/

    // Étape 2 — Nettoyage des promotions expirées
    console.log(`🧹 Nettoyage des anciennes promotions...`);
    const deletedCount = await cleanupExpiredPromotions();
    console.log(`   ${deletedCount} expirées supprimées.`);

    // Étape 3 — Récupération parallèle des nouvelles promotions
    console.log(`🚀 Récupération des nouvelles promotions...`);

    const results = await Promise.allSettled(
      CONFIG.stores.map(async (store) => {
        try {
          const promos = await fetchFlippPromotions(store, CONFIG.postalCode, CONFIG.maxPromoPerCategory);

          if (!promos || promos.length < CONFIG.minResultsThreshold) {
            console.warn(`⚠️ Aucune promotion valide récupérée pour ${store}`);
            return { store, status: "no_promotions", promotionsFound: promos?.length || 0 };
          }

          const saveResult = await storePromotions(promos);
          return {
            store,
            status: "success",
            promotionsFound: promos.length,
            inserted: saveResult.inserted,
            duplicates: saveResult.duplicates,
            errors: saveResult.errors
          };
        } catch (err: any) {
          console.error(`❌ Erreur pour ${store}:`, err.message);
          return { store, status: "error", error: err.message };
        }
      })
    );

    // Étape 4 — Agrégation des résultats
    const parsedResults = results.map((r) =>
      r.status === "fulfilled" ? r.value : { store: "unknown", status: "failed", error: r.reason }
    );

    const totalInserted = parsedResults.reduce((acc, r: any) => acc + (r.inserted || 0), 0);
    const totalFound = parsedResults.reduce((acc, r: any) => acc + (r.promotionsFound || 0), 0);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Étape 5 — Statistiques finales
    const stats = await getCurrentStats();

    console.log(`\n✅ IMPORT TERMINÉ (${duration}s)`);
    console.table(parsedResults.map((r: any) => ({
      Store: r.store,
      Found: r.promotionsFound,
      Inserted: r.inserted,
      Status: r.status
    })));

    return NextResponse.json({
      success: true,
      summary: {
        totalStores: CONFIG.stores.length,
        totalFound,
        totalInserted,
        duration
      },
      results: parsedResults,
      currentDatabase: stats
    });
  } catch (error: any) {
    console.error("❌ ERREUR GLOBALE:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des promotions",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  console.log(`\n🔄 IMPORT FORCÉ DEMANDÉ`);
  try {
    const { force } = await req.json();
    if (!force) {
      return NextResponse.json({ error: "Veuillez confirmer avec { force: true }" }, { status: 400 });
    }

    console.log(`🧹 Suppression complète...`);
    const { error: deleteError } = await supabase.from("promotions").delete().neq("id", 0);
    if (deleteError) throw deleteError;

    console.log(`✅ Base vidée, relance de l'import...`);
    return GET(req);
  } catch (error: any) {
    console.error(`❌ Erreur import forcé:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

