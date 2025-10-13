// scripts/importPromotions.ts - SCRIPT D'IMPORT AUTOMATISÉ

import { fetchFlippPromotions } from '@/lib/flyers';
import { BatchImporter } from '@/lib/importBatch';
import { Promotion } from '@/lib/flyers';

/**
 * Configuration de l'import
 */
const CONFIG = {
  postalCode: 'H7X3R8', // Laval, Québec
  stores: ['IGA', 'Metro'] as const,
  maxPerCategory: 20,
  cleanupExpired: true
};

/**
 * Script principal d'import
 */
async function main() {
  console.log('🚀 Démarrage de l\'import des promotions\n');
  console.log(`📍 Code postal: ${CONFIG.postalCode}`);
  console.log(`🏪 Magasins: ${CONFIG.stores.join(', ')}\n`);

  const startTime = Date.now();
  const allPromotions: Promotion[] = [];

  try {
    // Étape 1: Nettoyer les anciennes promotions
    if (CONFIG.cleanupExpired) {
      console.log('🧹 Nettoyage des promotions expirées...');
      const deleted = await BatchImporter.cleanupExpiredPromotions();
      console.log(`✅ ${deleted} promotions expirées supprimées\n`);
    }

    // Étape 2: Récupérer les promotions pour chaque magasin
    for (const store of CONFIG.stores) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Import ${store}`);
      console.log('='.repeat(60));

      try {
        const promotions = await fetchFlippPromotions(
          store,
          CONFIG.postalCode,
          CONFIG.maxPerCategory
        );

        if (promotions.length > 0) {
          allPromotions.push(...promotions);
          console.log(`✅ ${promotions.length} promotions récupérées pour ${store}`);
        } else {
          console.log(`⚠️ Aucune promotion trouvée pour ${store}`);
        }

        // Pause entre les magasins
        await sleep(2000);

      } catch (error: any) {
        console.error(`❌ Erreur import ${store}:`, error.message);
      }
    }

    // Étape 3: Importer dans la base de données
    if (allPromotions.length > 0) {
      console.log(`\n${'='.repeat(60)}`);
      console.log('💾 Import dans la base de données');
      console.log('='.repeat(60));

      const result = await BatchImporter.importPromotions(allPromotions);

      // Afficher les résultats
      console.log('\n📊 RÉSUMÉ DE L\'IMPORT:');
      console.log('='.repeat(60));
      console.log(`✅ Insertions réussies: ${result.inserted}`);
      console.log(`♻️  Doublons évités: ${result.duplicates}`);
      console.log(`❌ Erreurs: ${result.errors}`);
      console.log(`📦 Total reçu: ${result.totalReceived}`);
      console.log(`⏱️  Durée: ${(result.duration / 1000).toFixed(2)}s`);

      // Statistiques par magasin
      if (Object.keys(result.details.byStore).length > 0) {
        console.log('\n🏪 Par magasin:');
        Object.entries(result.details.byStore).forEach(([store, count]) => {
          console.log(`   ${store}: ${count} produits`);
        });
      }

      // Statistiques par catégorie
      if (Object.keys(result.details.byCategory).length > 0) {
        console.log('\n📂 Par catégorie:');
        Object.entries(result.details.byCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .forEach(([category, count]) => {
            console.log(`   ${category}: ${count} produits`);
          });
      }

    } else {
      console.log('\n⚠️ Aucune promotion à importer');
    }

    // Temps total
    const totalTime = Date.now() - startTime;
    console.log(`\n✅ Import terminé en ${(totalTime / 1000).toFixed(2)}s`);

  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

/**
 * Fonction de pause
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Script de test rapide (10 produits par magasin)
 */
async function testImport() {
  console.log('🧪 Mode TEST - Import limité\n');

  const testPromotions: Promotion[] = [];

  for (const store of CONFIG.stores) {
    console.log(`\n📦 Test ${store}...`);

    try {
      const promotions = await fetchFlippPromotions(
        store,
        CONFIG.postalCode,
        5 // Seulement 5 par catégorie
      );

      // Limiter à 10 produits max
      const limitedPromos = promotions.slice(0, 10);
      testPromotions.push(...limitedPromos);

      console.log(`✅ ${limitedPromos.length} promotions test récupérées`);

      await sleep(1000);

    } catch (error: any) {
      console.error(`❌ Erreur test ${store}:`, error.message);
    }
  }

  if (testPromotions.length > 0) {
    console.log(`\n💾 Import test de ${testPromotions.length} promotions...`);
    const result = await BatchImporter.importPromotions(testPromotions);

    console.log('\n📊 RÉSULTAT TEST:');
    console.log(`✅ Insertions: ${result.inserted}`);
    console.log(`♻️  Doublons: ${result.duplicates}`);
    console.log(`❌ Erreurs: ${result.errors}`);
  }
}

/**
 * Script de mise à jour incrémentale (pour cron)
 */
async function incrementalUpdate() {
  console.log('🔄 Mise à jour incrémentale\n');

  // Import pour un seul magasin à la fois (pour ne pas surcharger)
  const storeIndex = new Date().getDay() % 2; // Alterne IGA/Metro selon le jour
  const store = CONFIG.stores[storeIndex];

  console.log(`📦 Mise à jour ${store}...`);

  try {
    const promotions = await fetchFlippPromotions(
      store,
      CONFIG.postalCode,
      15 // Moins de produits pour mise à jour rapide
    );

    if (promotions.length > 0) {
      const result = await BatchImporter.importPromotions(promotions);
      
      console.log('\n✅ Mise à jour terminée:');
      console.log(`   Nouveaux produits: ${result.inserted}`);
      console.log(`   Doublons: ${result.duplicates}`);
    }

  } catch (error: any) {
    console.error(`❌ Erreur mise à jour:`, error.message);
  }
}

/**
 * Déterminer le mode d'exécution
 */
const mode = process.argv[2] || 'full';

switch (mode) {
  case 'test':
    testImport().catch(console.error);
    break;
  
  case 'incremental':
    incrementalUpdate().catch(console.error);
    break;
  
  case 'full':
  default:
    main().catch(console.error);
    break;
}

export { main, testImport, incrementalUpdate };