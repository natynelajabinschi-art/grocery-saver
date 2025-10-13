// app/api/clean/route.ts - NETTOYAGE COMPLET
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: NextRequest) {
  try {
    console.log('🧹 DÉBUT DU NETTOYAGE COMPLET...');
    
    // Liste de tous les mots-clés problématiques à supprimer
    const problematicKeywords = [
      'lait de coco', 'coconut', 'suree', 'boisson',
      'biscottes', 'semoule', 'sans œufs', 'sans oeufs', 
      'hamburger', 'gadoua', 'baguette', 'brioche', 'raisin', 'cannelle',
      'simili', 'mock', 'pain riz', 'drinkable', 'yop',
      'gaspésien', 'collant', 'coréen', 'yogourt à boire', 'yoplait'
    ];

    let totalDeleted = 0;

    for (const keyword of problematicKeywords) {
      const { error } = await supabase
        .from("promotions")
        .delete()
        .ilike('product_name', `%${keyword}%`);

      if (!error) {
        console.log(`✅ Supprimé promotions avec: ${keyword}`);
        totalDeleted++;
      }
    }

    // Maintenant ajouter des BONS produits de test
    console.log('📦 Ajout des bons produits de test...');
    
    const goodProducts = [
      // LAIT
      {
        product_name: "Lait 2% 2L",
        store_name: "IGA",
        old_price: 5.50,
        new_price: 4.50,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        product_name: "Lait 2% 2L", 
        store_name: "Metro",
        old_price: 5.75,
        new_price: 4.75,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      // PAIN
      {
        product_name: "Pain blanc tranché",
        store_name: "IGA", 
        old_price: 4.25,
        new_price: 3.50,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        product_name: "Pain blanc tranché",
        store_name: "Metro",
        old_price: 4.50,
        new_price: 3.75,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      // ŒUFS
      {
        product_name: "Œufs blancs grande 12",
        store_name: "IGA",
        old_price: 5.00,
        new_price: 4.25,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        product_name: "Œufs bruns grande 12",
        store_name: "Metro", 
        old_price: 5.25,
        new_price: 4.50,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      // POUR TESTER D'AUTRES PRODUITS
      {
        product_name: "Poulet entier",
        store_name: "IGA",
        old_price: 12.00,
        new_price: 9.99,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        product_name: "Riz basmati 1kg",
        store_name: "IGA",
        old_price: 6.00,
        new_price: 4.99,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        product_name: "Brocoli",
        store_name: "IGA", 
        old_price: 3.50,
        new_price: 2.99,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    ];

    const { error: insertError } = await supabase
      .from("promotions")
      .insert(goodProducts);

    if (!insertError) {
      console.log("✅ Bons produits ajoutés avec succès!");
    }

    return NextResponse.json({
      success: true,
      message: `🧹 Nettoyage terminé! ${totalDeleted} catégories problématiques supprimées et bons produits ajoutés.`,
      products_added: goodProducts.length
    });

  } catch (error) {
    console.error("❌ Erreur nettoyage:", error);
    return NextResponse.json({ 
      success: false,
      error: "Erreur lors du nettoyage" 
    }, { status: 500 });
  }
}

// Ajouter aussi POST pour flexibilité
export async function POST(req: NextRequest) {
  return await GET(req);
}