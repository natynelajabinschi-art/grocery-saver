//api/flyers/route.js
import { NextRequest, NextResponse } from "next/server";
import { fetchFlippPromotions } from "@/lib/flyers";
import { storePromotions } from "@/lib/storePromotions";
import { supabase } from "@/lib/supabaseClient";

async function hasImportedToday(): Promise<{ hasImported: boolean; count?: number }> {
  const today = new Date().toISOString().slice(0, 10);
  
  const { count, error } = await supabase
    .from("promotions")
    .select('*', { count: 'exact', head: true })
    .eq('start_date', today);

  if (error) {
    console.error("❌ Erreur vérification import:", error);
    return { hasImported: false };
  }

  return { hasImported: (count || 0) > 0, count };
}

export async function GET(req: NextRequest) {
  const stores = ["IGA", "Metro", "Super-C"] as const; // 🔥 AJOUT DE SUPER-C
  const postalCode = "H2S0B8";

  try {
    // Vérifier si on a déjà importé aujourd'hui
    const importCheck = await hasImportedToday();
    
    if (importCheck.hasImported) {
      return NextResponse.json({
        success: true,
        message: `📅 Import déjà effectué aujourd'hui (${new Date().toISOString().slice(0, 10)})`,
        existingCount: importCheck.count,
        advice: "Les promotions sont à jour. Réessayez demain pour de nouvelles promotions."
      });
    }

    const results = [];
    let totalPromotions = 0;

    // Import des promotions pour chaque magasin
    for (const store of stores) {
      console.log(`🛒 Recherche des promotions ${store}...`);
      
      try {
        const promotions = await fetchFlippPromotions(store, postalCode);
        
        if (promotions.length > 0) {
          const saveResult = await storePromotions(promotions);
          totalPromotions += promotions.length;
          
          results.push({
            store,
            status: "success",
            promotionsFound: promotions.length,
            saveResult
          });
          
          console.log(`✅ ${promotions.length} promotions trouvées pour ${store}`);
        } else {
          results.push({
            store, 
            status: "no_promotions",
            promotionsFound: 0,
            message: "Aucune promotion trouvée"
          });
          
          console.log(`⚠️ Aucune promotion trouvée pour ${store}`);
        }
      } catch (storeError) {
        console.error(`❌ Erreur pour ${store}:`, storeError);
        results.push({
          store,
          status: "error",
          error: storeError instanceof Error ? storeError.message : "Erreur inconnue"
        });
      }
    }

    return NextResponse.json({
      success: true,
      date: new Date().toISOString().slice(0, 10),
      summary: {
        totalStores: stores.length,
        storesProcessed: results.filter(r => r.status === "success").length,
        totalPromotionsFound: totalPromotions
      },
      results
    });

  } catch (error) {
    console.error("❌ Erreur API:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur lors de la récupération des promotions" 
      },
      { status: 500 }
    );
  }
}