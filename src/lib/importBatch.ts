
// lib/importBatch.ts - IMPORT INTELLIGENT PAR LOTS AVEC DÉDUPLICATION

import { supabase } from "./supabaseClient";
import { Promotion } from "./flyers";

interface ImportResult {
  success: boolean;
  inserted: number;
  duplicates: number;
  errors: number;
  totalReceived: number;
  duration: number;
  details: {
    byStore: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

export class BatchImporter {
  private static BATCH_SIZE = 100; // Taille optimale pour Supabase
  private static MAX_RETRIES = 3;

  /**
   * Importe les promotions avec gestion intelligente des doublons
   */
  static async importPromotions(promotions: Promotion[]): Promise<ImportResult> {
    const startTime = Date.now();
    
    console.log(`\n📦 Démarrage import batch: ${promotions.length} promotions`);

    if (promotions.length === 0) {
      return this.createEmptyResult(startTime);
    }

    // Étape 1: Déduplication locale
    const uniquePromos = this.deduplicatePromotions(promotions);
    console.log(`✂️ Après déduplication: ${uniquePromos.length}/${promotions.length}`);

    // Étape 2: Vérifier les doublons en base (optimisé)
    const newPromos = await this.filterExistingPromotions(uniquePromos);
    console.log(`🔍 Nouvelles promotions: ${newPromos.length}`);

    // Étape 3: Import par lots
    const insertResult = await this.insertInBatches(newPromos);

    // Étape 4: Statistiques
    const stats = this.calculateStats(insertResult.inserted, uniquePromos);

    const duration = Date.now() - startTime;
    console.log(`✅ Import terminé en ${(duration/1000).toFixed(2)}s`);

    return {
      success: true,
      inserted: insertResult.inserted.length,
      duplicates: uniquePromos.length - newPromos.length,
      errors: insertResult.errors,
      totalReceived: promotions.length,
      duration,
      details: {
        byStore: stats.byStore,
        byCategory: stats.byCategory
      }
    };
  }

  /**
   * Déduplique les promotions dans le batch
   */
  private static deduplicatePromotions(promotions: Promotion[]): Promotion[] {
    const seen = new Map<string, Promotion>();

    for (const promo of promotions) {
      const key = this.generatePromoKey(promo);
      
      // Garder la promotion avec le meilleur prix si doublon
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
   * Génère une clé unique pour une promotion
   */
  private static generatePromoKey(promo: Promotion): string {
    const normalized = promo.product_name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
    
    return `${promo.store_name}|${normalized}|${promo.flyer_id || 'no-flyer'}`;
  }

  /**
   * Filtre les promotions qui existent déjà en base (optimisé)
   */
  private static async filterExistingPromotions(promotions: Promotion[]): Promise<Promotion[]> {
    if (promotions.length === 0) return [];

    try {
      const today = new Date().toISOString().slice(0, 10);

      // Récupérer tous les product_name existants en une seule requête
      const productNames = promotions.map(p => p.product_name.toLowerCase().trim());
      const stores = [...new Set(promotions.map(p => p.store_name))];

      const { data: existing, error } = await supabase
        .from("promotions")
        .select("product_name, store_name, flyer_id")
        .in("store_name", stores)
        .gte("end_date", today);

      if (error) {
        console.warn("⚠️ Erreur vérification doublons, insertion complète");
        return promotions;
      }

      // Créer un Set des clés existantes
      const existingKeys = new Set(
        (existing || []).map(e => 
          `${e.store_name}|${e.product_name.toLowerCase().trim()}|${e.flyer_id || 'no-flyer'}`
        )
      );

      // Filtrer les nouvelles promotions
      const newPromos = promotions.filter(promo => {
        const key = this.generatePromoKey(promo);
        return !existingKeys.has(key);
      });

      console.log(`♻️ Doublons évités: ${promotions.length - newPromos.length}`);
      return newPromos;

    } catch (error) {
      console.error("❌ Erreur filtrage:", error);
      return promotions; // En cas d'erreur, tout insérer
    }
  }

  /**
   * Insère les promotions par lots avec retry
   */
  private static async insertInBatches(
    promotions: Promotion[]
  ): Promise<{ inserted: Promotion[]; errors: number }> {
    const inserted: Promotion[] = [];
    let errorCount = 0;

    const batches = this.createBatches(promotions, this.BATCH_SIZE);
    console.log(`📊 ${batches.length} lots à insérer`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`   Lot ${i + 1}/${batches.length}: ${batch.length} items`);

      let success = false;
      let retries = 0;

      while (!success && retries < this.MAX_RETRIES) {
        try {
          const { data, error } = await supabase
            .from("promotions")
            .insert(batch)
            .select();

          if (error) {
            throw error;
          }

          if (data) {
            inserted.push(...data);
            console.log(`   ✅ ${data.length} insertions réussies`);
          }

          success = true;

        } catch (error: any) {
          retries++;
          
          if (error.code === '23505') {
            // Doublons - essayer insertion individuelle
            console.log(`   🔄 Doublons détectés, insertion individuelle...`);
            const individualResults = await this.insertIndividually(batch);
            inserted.push(...individualResults.inserted);
            errorCount += individualResults.errors;
            success = true;
          } else if (retries < this.MAX_RETRIES) {
            console.log(`   ⚠️ Retry ${retries}/${this.MAX_RETRIES}`);
            await this.sleep(1000 * retries); // Backoff exponentiel
          } else {
            console.error(`   ❌ Échec après ${this.MAX_RETRIES} tentatives`);
            errorCount += batch.length;
            success = true; // Arrêter les retries
          }
        }
      }

      // Pause entre les lots
      if (i < batches.length - 1) {
        await this.sleep(200);
      }
    }

    return { inserted, errors: errorCount };
  }

  /**
   * Insère les items un par un (fallback)
   */
  private static async insertIndividually(
    batch: Promotion[]
  ): Promise<{ inserted: Promotion[]; errors: number }> {
    const inserted: Promotion[] = [];
    let errors = 0;

    for (const item of batch) {
      try {
        const { data, error } = await supabase
          .from("promotions")
          .insert(item)
          .select()
          .single();

        if (error) {
          if (error.code !== '23505') { // Ignorer les doublons
            errors++;
          }
        } else if (data) {
          inserted.push(data);
        }
      } catch (error) {
        errors++;
      }
    }

    return { inserted, errors };
  }

  /**
   * Crée des lots de taille fixe
   */
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Calcule les statistiques d'import
   */
  private static calculateStats(
    inserted: Promotion[],
    all: Promotion[]
  ): { byStore: Record<string, number>; byCategory: Record<string, number> } {
    const byStore: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    inserted.forEach(promo => {
      // Par magasin
      byStore[promo.store_name] = (byStore[promo.store_name] || 0) + 1;

      // Par catégorie
      if (promo.category) {
        byCategory[promo.category] = (byCategory[promo.category] || 0) + 1;
      }
    });

    return { byStore, byCategory };
  }

  /**
   * Crée un résultat vide
   */
  private static createEmptyResult(startTime: number): ImportResult {
    return {
      success: true,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      totalReceived: 0,
      duration: Date.now() - startTime,
      details: {
        byStore: {},
        byCategory: {}
      }
    };
  }

  /**
   * Utilitaire de pause
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Nettoie les anciennes promotions expirées
   */
  static async cleanupExpiredPromotions(): Promise<number> {
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
      console.log(`🧹 ${deleted} promotions expirées supprimées`);
      return deleted;

    } catch (error) {
      console.error("❌ Erreur nettoyage:", error);
      return 0;
    }
  }
}

// Alias pour compatibilité avec l'ancien code
export async function storePromotions(promos: Promotion[]) {
  const result = await BatchImporter.importPromotions(promos);
  
  return {
    success: result.success,
    inserted: result.inserted,
    totalReceived: result.totalReceived,
    date: new Date().toISOString().split('T')[0]
  };
}