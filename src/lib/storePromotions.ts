// lib/storePromotions.ts - VERSION CORRIGÉE
import { supabase } from "./supabaseClient";
import { Promotion } from "./flyers";

export async function storePromotions(promos: Promotion[]) {
  if (promos.length === 0) {
    console.log("📭 Aucune promotion à stocker");
    return { success: true, inserted: 0, message: "Aucune promotion à stocker" };
  }

  // Étape 1: Éliminer les doublons dans le batch
  const uniquePromos = removeDuplicatesInBatch(promos);
  console.log(`📊 Après déduplication: ${uniquePromos.length}/${promos.length}`);

  const today = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Étape 2: Préparer les données
  const dataToInsert = uniquePromos.map(p => ({
    product_name: p.product_name.trim(),
    store_name: p.store_name,
    old_price: p.old_price,
    new_price: p.new_price,
    start_date: today,
    end_date: p.end_date || endDate,
    flyer_id: p.flyer_id || null
  }));

  // Étape 3: Insérer par petits lots
  const BATCH_SIZE = 50;
  let totalInserted = 0;

  for (let i = 0; i < dataToInsert.length; i += BATCH_SIZE) {
    const batch = dataToInsert.slice(i, i + BATCH_SIZE);
    
    try {
      const { data, error } = await supabase
        .from("promotions")
        .insert(batch)
        .select();

      if (error) {
        // Si erreur de doublon, essayer un par un
        if (error.code === '23505') {
          console.log(`🔄 Doublons détectés, insertion un par un...`);
          const individualResults = await insertOneByOne(batch);
          totalInserted += individualResults.length;
        } else {
          console.error(`❌ Erreur insertion batch:`, error);
        }
      } else {
        totalInserted += data?.length || 0;
        console.log(`✅ Lot ${i/BATCH_SIZE + 1}: ${data?.length || 0} insertions`);
      }
    } catch (error) {
      console.error(`❌ Erreur lot ${i/BATCH_SIZE + 1}:`, error);
    }
  }

  console.log(`💾 Total insertions réussies: ${totalInserted}`);
  return {
    success: true,
    inserted: totalInserted,
    totalReceived: promos.length,
    date: today
  };
}

function removeDuplicatesInBatch(promos: Promotion[]): Promotion[] {
  const seen = new Set();
  return promos.filter(promo => {
    const key = `${promo.product_name.toLowerCase().trim()}|${promo.store_name}|${promo.flyer_id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function insertOneByOne(batch: any[]): Promise<any[]> {
  const results = [];
  
  for (const item of batch) {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .insert(item)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Doublon ignoré silencieusement
        } else {
          console.error(`❌ Erreur insertion ${item.product_name}:`, error.message);
        }
      } else if (data) {
        results.push(data);
      }
    } catch (error) {
      console.error(`❌ Erreur inattendue:`, error);
    }
  }
  
  return results;
}