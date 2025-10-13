// lib/flyers.ts - RECHERCHE OPTIMISÉE PAR CATÉGORIES
import axios from "axios";

export interface Promotion {
  product_name: string;
  store_name: "IGA" | "Metro";
  old_price: number | null;
  new_price: number;
  start_date?: string;
  end_date?: string;
  flyer_id?: number;
  category?: string;
}

const headers = {
  "User-Agent": "GrocerySaver/1.0",
  "Accept": "application/json"
};

// Catégories de produits alimentaires ÉLARGIES
const FOOD_CATEGORIES = {
  dairy: ['lait', 'fromage', 'beurre', 'yaourt', 'yogourt', 'crème'],
  meat: ['poulet', 'bœuf', 'porc', 'viande', 'bacon', 'jambon', 'saucisse'],
  fish: ['poisson', 'saumon', 'thon', 'crevette', 'fruits mer'],
  fruits: ['pomme', 'banane', 'orange', 'fraise', 'raisin', 'kiwi', 'melon'],
  vegetables: ['carotte', 'tomate', 'laitue', 'brocoli', 'oignon', 'légume'],
  bakery: ['pain', 'baguette', 'croissant', 'brioche'],
  pantry: ['riz', 'pâtes', 'huile', 'farine', 'sucre', 'sel', 'sauce'],
  beverages: ['jus', 'eau', 'café', 'thé', 'boisson'],
  frozen: ['surgelé', 'glace', 'pizza'],
  snacks: ['biscuit', 'chocolat', 'chips', 'bonbon', 'gâteau'],
  breakfast: ['céréale', 'confiture', 'miel', 'sirop']
};

// Mots-clés à EXCLURE (non-alimentaires)
const EXCLUDE_KEYWORDS = [
  'bed', 'bedroom', 'furniture', 'meuble', 'lit', 'chaise', 'table',
  'sofa', 'desk', 'cabinet', 'shelf', 'wardrobe', 'mattress',
  'pillow', 'comforter', 'blanket', 'curtain', 'rug', 'carpet',
  'lamp', 'mirror', 'frame', 'art', 'décoration', 'rideau', 'tapis'
];

/**
 * Vérifie si un produit est alimentaire
 */
function isFoodProduct(productName: string): boolean {
  const name = productName.toLowerCase();

  // Exclure d'abord les non-alimentaires
  if (EXCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) {
    return false;
  }

  // Vérifier si le produit correspond à une catégorie alimentaire
  for (const category of Object.values(FOOD_CATEGORIES)) {
    if (category.some(keyword => name.includes(keyword))) {
      return true;
    }
  }

  return false;
}

/**
 * Détermine la catégorie d'un produit
 */
function categorizeProduct(productName: string): string | undefined {
  const name = productName.toLowerCase();

  for (const [categoryName, keywords] of Object.entries(FOOD_CATEGORIES)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return categoryName;
    }
  }

  return undefined;
}

/**
 * Recherche optimisée par catégories
 */
export async function fetchFlippPromotions(
  store: "IGA" | "Metro", 
  postalCode: string,
  maxPerCategory: number = 20
): Promise<Promotion[]> {
  console.log(`\n🚀 Recherche optimisée pour ${store}...`);
  
  const promotions: Promotion[] = [];
  const seenProducts = new Set<string>();
  
  try {
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Rechercher par catégorie (plus efficace que terme par terme)
    for (const [categoryName, keywords] of Object.entries(FOOD_CATEGORIES)) {
      console.log(`\n📂 Catégorie: ${categoryName}`);
      
      let categoryCount = 0;

      // Prendre 2-3 termes principaux par catégorie
      for (const term of keywords.slice(0, 3)) {
        if (categoryCount >= maxPerCategory) break;

        const url = `https://backflipp.wishabi.com/flipp/items/search?postal_code=${postalCode}&q=${encodeURIComponent(term)}`;
        
        try {
          const res = await axios.get(url, { 
            headers,
            timeout: 5000 // Timeout de 5 secondes
          });
          
          const items = res.data.items || [];
          
          // Filtrer et traiter les produits
          for (const item of items) {
            const productName = (item.name || item.title || '').trim();
            
            if (!productName || productName === 'Produit sans nom') continue;
            
            // Éviter les doublons
            const productKey = `${store}|${productName.toLowerCase()}`;
            if (seenProducts.has(productKey)) continue;
            
            // Vérifier si c'est un produit alimentaire
            if (!isFoodProduct(productName)) continue;

            const salePrice = parseFloat(item.sale_price || item.current_price || item.price || 0);
            const regularPrice = parseFloat(item.price || item.original_price || 0);

            if (salePrice > 0) {
              promotions.push({
                product_name: productName,
                old_price: regularPrice > salePrice ? regularPrice : null,
                new_price: salePrice,
                store_name: store,
                flyer_id: item.flyer_id,
                start_date: today,
                end_date: endDate,
                category: categoryName
              });

              seenProducts.add(productKey);
              categoryCount++;
            }

            if (categoryCount >= maxPerCategory) break;
          }

          console.log(`   ✓ ${term}: ${categoryCount} produits`);

        } catch (error: any) {
          if (error.code === 'ECONNABORTED') {
            console.log(`   ⏱️ Timeout pour "${term}"`);
          } else {
            console.error(`   ❌ Erreur "${term}": ${error.message}`);
          }
        }

        // Pause anti rate-limit
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

  } catch (error: any) {
    console.error(`❌ Erreur générale ${store}:`, error.message);
  }

  console.log(`\n🎯 TOTAL ${store}: ${promotions.length} produits uniques`);
  
  // Statistiques par catégorie
  const categoryStats: Record<string, number> = {};
  promotions.forEach(p => {
    if (p.category) {
      categoryStats[p.category] = (categoryStats[p.category] || 0) + 1;
    }
  });

  console.log('\n📊 Répartition par catégorie:');
  Object.entries(categoryStats).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} produits`);
  });

  // Afficher des exemples
  if (promotions.length > 0) {
    console.log(`\n📝 Exemples de produits trouvés:`);
    promotions.slice(0, 8).forEach((p, i) => {
      const promo = p.old_price ? ` (était ${p.old_price})` : '';
      console.log(`   ${i + 1}. [${p.category}] ${p.product_name} - ${p.new_price}${promo}`);
    });
  }

  return promotions;
}

/**
 * Recherche ciblée pour une liste de produits spécifique
 */
export async function fetchTargetedPromotions(
  store: "IGA" | "Metro",
  postalCode: string,
  productList: string[]
): Promise<Promotion[]> {
  console.log(`\n🎯 Recherche ciblée pour ${store}: ${productList.join(', ')}`);
  
  const promotions: Promotion[] = [];
  const seenProducts = new Set<string>();
  
  const today = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const product of productList) {
    const searchTerm = product.toLowerCase().trim();
    const url = `https://backflipp.wishabi.com/flipp/items/search?postal_code=${postalCode}&q=${encodeURIComponent(searchTerm)}`;
    
    try {
      const res = await axios.get(url, { headers, timeout: 5000 });
      const items = res.data.items || [];
      
      for (const item of items) {
        const productName = (item.name || item.title || '').trim();
        if (!productName) continue;
        
        const productKey = `${store}|${productName.toLowerCase()}`;
        if (seenProducts.has(productKey)) continue;
        
        if (!isFoodProduct(productName)) continue;

        const salePrice = parseFloat(item.sale_price || item.current_price || item.price || 0);
        const regularPrice = parseFloat(item.price || item.original_price || 0);

        if (salePrice > 0) {
          promotions.push({
            product_name: productName,
            old_price: regularPrice > salePrice ? regularPrice : null,
            new_price: salePrice,
            store_name: store,
            flyer_id: item.flyer_id,
            start_date: today,
            end_date: endDate,
            category: categorizeProduct(productName)
          });

          seenProducts.add(productKey);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: any) {
      console.error(`❌ Erreur recherche "${product}":`, error.message);
    }
  }

  console.log(`✅ ${promotions.length} promotions trouvées`);
  return promotions;
}