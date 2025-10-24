// lib/storePromotions.ts - VERSION OPTIMISÉE ET PERFORMANTE
import { supabase } from "./supabaseClient";
import { Promotion } from "./flyers";

interface StoreResult {
  success: boolean;
  inserted: number;
  duplicates: number;
  errors: number;
  totalReceived: number;
  date: string;
  duration: number;
}

/**
 * Stocke les promotions avec gestion intelligente des doublons
 */
export async function storePromotions(promos: Promotion[]): Promise<StoreResult> {
  const startTime = Date.now();
  
  if (promos.length === 0) {
    console.log("📭 Aucune promotion à stocker");
    return createEmptyResult(startTime);
  }

  console.log(`\n📦 Import de ${promos.length} promotions...`);

  // Étape 1: Déduplication locale (rapide)
  const uniquePromos = deduplicateLocally(promos);
  const localDuplicates = promos.length - uniquePromos.length;
  
  if (localDuplicates > 0) {
    console.log(`✂️ ${localDuplicates} doublons locaux éliminés`);
  }

  // Étape 2: Vérifier les doublons existants en base (optimisé)
  const newPromos = await filterExistingPromotions(uniquePromos);
  const dbDuplicates = uniquePromos.length - newPromos.length;
  
  if (dbDuplicates > 0) {
    console.log(`♻️ ${dbDuplicates} doublons existants évités`);
  }

  if (newPromos.length === 0) {
    console.log("✅ Toutes les promotions existent déjà");
    return {
      success: true,
      inserted: 0,
      duplicates: localDuplicates + dbDuplicates,
      errors: 0,
      totalReceived: promos.length,
      date: new Date().toISOString().split('T')[0],
      duration: Date.now() - startTime
    };
  }

  // Étape 3: Préparer les données
  const today = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  const dataToInsert = newPromos.map(p => ({
    product_name: p.product_name.trim(),
    store_name: p.store_name,
    old_price: p.old_price,
    new_price: p.new_price,
    start_date: p.start_date || today,
    end_date: p.end_date || endDate,
    flyer_id: p.flyer_id || null,
    category: p.category || null
  }));

  // Étape 4: Insertion par lots avec retry
  const insertResult = await insertInBatches(dataToInsert);

  const duration = Date.now() - startTime;
  console.log(`\n✅ Import terminé en ${(duration/1000).toFixed(2)}s`);
  console.log(`   💾 Insérés: ${insertResult.inserted}`);
  console.log(`   ⚠️ Erreurs: ${insertResult.errors}`);

  return {
    success: true,
    inserted: insertResult.inserted,
    duplicates: localDuplicates + dbDuplicates,
    errors: insertResult.errors,
    totalReceived: promos.length,
    date: today,
    duration
  };
}

/**
 * Déduplication locale (dans le batch)
 */
function deduplicateLocally(promos: Promotion[]): Promotion[] {
  const seen = new Map<string, Promotion>();

  for (const promo of promos) {
    const key = generatePromoKey(promo);
    
    // Garder la meilleure offre en cas de doublon
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      if (promo.new_price < existing.new_price) {
        seen.set(key, promo);
      }
    } else {
      seen.set(key, promo);
    }
  }

  return Array.from(seen.values());
}

/**
 * Génère une clé unique pour identifier un produit
 */
function generatePromoKey(promo: Promotion): string {
  const normalized = promo.product_name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  
  return `${promo.store_name}|${normalized}|${promo.flyer_id || 'no-flyer'}`;
}

/**
 * Filtre les promotions qui existent déjà en base (optimisé)
 */
async function filterExistingPromotions(promos: Promotion[]): Promise<Promotion[]> {
  if (promos.length === 0) return [];

  try {
    const today = new Date().toISOString().slice(0, 10);
    const stores = [...new Set(promos.map(p => p.store_name))];

    // Récupérer les promotions actives en une seule requête
    const { data: existing, error } = await supabase
      .from("promotions")
      .select("product_name, store_name, flyer_id")
      .in("store_name", stores)
      .gte("end_date", today);

    if (error) {
      console.warn("⚠️ Impossible de vérifier les doublons, insertion complète");
      return promos;
    }

    // Créer un Set des clés existantes pour recherche O(1)
    const existingKeys = new Set(
      (existing || []).map(e => 
        `${e.store_name}|${e.product_name.toLowerCase().trim()}|${e.flyer_id || 'no-flyer'}`
      )
    );

    // Filtrer les nouvelles promotions
    return promos.filter(promo => !existingKeys.has(generatePromoKey(promo)));

  } catch (error) {
    console.error("❌ Erreur filtrage doublons:", error);
    return promos; // En cas d'erreur, tout insérer
  }
}

/**
 * Insère les promotions par lots avec gestion d'erreur robuste
 */
async function insertInBatches(
  data: any[]
): Promise<{ inserted: number; errors: number }> {
  const BATCH_SIZE = 100; // Taille optimale pour Supabase
  const MAX_RETRIES = 3;
  
  let totalInserted = 0;
  let totalErrors = 0;

  const batches = createBatches(data, BATCH_SIZE);
  console.log(`📊 ${batches.length} lot${batches.length > 1 ? 's' : ''} à insérer`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    let success = false;
    let retries = 0;

    while (!success && retries < MAX_RETRIES) {
      try {
        const { data: insertedData, error } = await supabase
          .from("promotions")
          .insert(batch)
          .select();

        if (error) {
          throw error;
        }

        totalInserted += insertedData?.length || 0;
        console.log(`   ✅ Lot ${i + 1}/${batches.length}: ${insertedData?.length || 0} insertions`);
        success = true;

      } catch (error: any) {
        retries++;
        
        // Gestion spécifique des doublons (code PostgreSQL 23505)
        if (error.code === '23505') {
          console.log(`   🔄 Doublons détectés dans lot ${i + 1}, insertion individuelle...`);
          const individualResult = await insertOneByOne(batch);
          totalInserted += individualResult.inserted;
          totalErrors += individualResult.errors;
          success = true;
        } 
        // Retry avec backoff exponentiel
        else if (retries < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, retries - 1); // 1s, 2s, 4s
          console.log(`   ⚠️ Tentative ${retries}/${MAX_RETRIES}, attente ${delay}ms...`);
          await sleep(delay);
        } 
        // Échec final
        else {
          console.error(`   ❌ Échec lot ${i + 1} après ${MAX_RETRIES} tentatives:`, error.message);
          totalErrors += batch.length;
          success = true; // Arrêter les retries
        }
      }
    }

    // Pause entre les lots pour éviter le rate limiting
    if (i < batches.length - 1) {
      await sleep(200);
    }
  }

  return { inserted: totalInserted, errors: totalErrors };
}

/**
 * Insertion individuelle (fallback en cas de doublons)
 */
async function insertOneByOne(batch: any[]): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (const item of batch) {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .insert(item)
        .select()
        .single();

      if (error) {
        // Ignorer silencieusement les doublons
        if (error.code !== '23505') {
          errors++;
          console.error(`   ❌ ${item.product_name}: ${error.message}`);
        }
      } else if (data) {
        inserted++;
      }
    } catch (error: any) {
      errors++;
      console.error(`   ❌ Erreur inattendue: ${error.message}`);
    }
  }

  console.log(`   💾 Résultat individuel: ${inserted} insérés, ${errors} erreurs`);
  return { inserted, errors };
}

/**
 * Crée des lots de taille fixe
 */
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Fonction d'attente
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Crée un résultat vide
 */
function createEmptyResult(startTime: number): StoreResult {
  return {
    success: true,
    inserted: 0,
    duplicates: 0,
    errors: 0,
    totalReceived: 0,
    date: new Date().toISOString().split('T')[0],
    duration: Date.now() - startTime
  };
}

/**
 * Nettoie les promotions expirées (utilitaire)
 */
export async function cleanupExpiredPromotions(): Promise<number> {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("promotions")
      .delete()
      .lt("end_date", today)
      .select();

    if (error) {
      console.error("❌ Erreur nettoyage:", error);
      return 0;
    }

    const deleted = data?.length || 0;
    if (deleted > 0) {
      console.log(`🧹 ${deleted} promotion${deleted > 1 ? 's' : ''} expirée${deleted > 1 ? 's' : ''} supprimée${deleted > 1 ? 's' : ''}`);
    }
    return deleted;

  } catch (error) {
    console.error("❌ Erreur nettoyage:", error);
    return 0;
  }
}