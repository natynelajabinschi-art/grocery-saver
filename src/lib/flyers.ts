// lib/flyers.ts - VERSION OPTIMISÉE
import axios from "axios";

export interface Promotion {
  product_name: string;
  store_name: "IGA" | "Metro" | "Super-C";
  old_price: number | null;
  new_price: number;
  start_date?: string;
  end_date?: string;
  flyer_id?: number;
  category?: string;
  confidence?: number; // Nouveau: score de confiance
}

const headers = {
  "User-Agent": "GrocerySaver/1.0",
  "Accept": "application/json"
};

// Catégories optimisées avec mots-clés plus précis
const FOOD_CATEGORIES = {
  dairy: ['lait', 'fromage', 'beurre', 'yaourt', 'yogourt', 'crème fraîche', 'crème sure'],
  meat: ['poulet', 'bœuf', 'porc', 'viande hachée', 'bacon', 'jambon', 'saucisse', 'steak'],
  fish: ['poisson', 'saumon', 'thon', 'crevette', 'homard', 'morue', 'tilapia'],
  fruits: ['pomme', 'banane', 'orange', 'fraise', 'raisin', 'kiwi', 'melon', 'mangue', 'ananas'],
  vegetables: ['carotte', 'tomate', 'laitue', 'brocoli', 'oignon', 'poivron', 'concombre', 'céleri'],
  bakery: ['pain blanc', 'pain blé', 'baguette', 'croissant', 'muffin', 'bagel'],
  pantry: ['riz', 'pâtes', 'huile', 'farine', 'sucre', 'sel', 'sauce tomate', 'conserve'],
  beverages: ['jus orange', 'jus pomme', 'eau', 'café', 'thé'],
  frozen: ['pizza surgelée', 'légumes surgelés', 'crème glacée', 'frites surgelées'],
  snacks: ['biscuit', 'chocolat', 'chips', 'craquelins', 'noix'],
  breakfast: ['céréale', 'gruau', 'confiture', 'miel', 'sirop érable']
};

// Liste ÉLARGIE d'exclusions
const EXCLUDE_KEYWORDS = [
  // Meubles et décoration
  'bed', 'bedroom', 'furniture', 'meuble', 'lit', 'chaise', 'table', 'sofa', 'desk',
  'cabinet', 'shelf', 'wardrobe', 'mattress', 'pillow', 'comforter', 'blanket',
  'curtain', 'rideau', 'tapis', 'carpet', 'rug', 'lamp', 'lampe', 'mirror', 'miroir',
  
  // Non-alimentaires spécifiques
  'shampoo', 'savon', 'soap', 'detergent', 'lessive', 'nettoyant', 'cleaner',
  'papier toilette', 'toilet paper', 'serviette', 'towel',
  
  // Produits ambigus à exclure
  'lait de coco', 'coconut milk', 'boisson végétale', 'plant-based drink',
  'simili', 'mock', 'imitation'
];

/**
 * Vérifie si un produit est alimentaire avec score de confiance
 */
function isFoodProduct(productName: string): { isFood: boolean; confidence: number } {
  const name = productName.toLowerCase();

  // Exclure d'abord les non-alimentaires (priorité)
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (name.includes(keyword)) {
      return { isFood: false, confidence: 0 };
    }
  }

  // Calculer le score de confiance basé sur les catégories
  let maxConfidence = 0;
  let matchedCategory = false;

  for (const [category, keywords] of Object.entries(FOOD_CATEGORIES)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        matchedCategory = true;
        // Plus le mot-clé est long et spécifique, plus la confiance est élevée
        const confidence = Math.min(1, keyword.length / 15);
        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }
  }

  return { 
    isFood: matchedCategory, 
    confidence: Math.round(maxConfidence * 100) / 100 
  };
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
 * Recherche optimisée avec retry et gestion d'erreur améliorée
 */
export async function fetchFlippPromotions(
  store: "IGA" | "Metro" | "Super-C", 
  postalCode: string,
  maxPerCategory: number = 15
): Promise<Promotion[]> {
  console.log(`\n🔍 Recherche pour ${store} (max ${maxPerCategory}/catégorie)...`);
  
  const promotions: Promotion[] = [];
  const seenProducts = new Set<string>();
  
  try {
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Stratégie: Prioriser les catégories populaires
    const priorityCategories = ['dairy', 'meat', 'fruits', 'vegetables', 'bakery'];
    const otherCategories = Object.keys(FOOD_CATEGORIES).filter(c => !priorityCategories.includes(c));
    const sortedCategories = [...priorityCategories, ...otherCategories];

    for (const categoryName of sortedCategories) {
      const keywords = FOOD_CATEGORIES[categoryName as keyof typeof FOOD_CATEGORIES];
      console.log(`\n📂 ${categoryName}`);
      
      let categoryCount = 0;

      // Utiliser les 2 meilleurs mots-clés par catégorie
      for (const term of keywords.slice(0, 2)) {
        if (categoryCount >= maxPerCategory) break;

        const url = `https://backflipp.wishabi.com/flipp/items/search?postal_code=${postalCode}&q=${encodeURIComponent(term)}`;
        
        try {
          const res = await axios.get(url, { 
            headers,
            timeout: 6000
          });
          
          const items = res.data.items || [];
          
          for (const item of items) {
            const productName = (item.name || item.title || '').trim();
            
            if (!productName || productName === 'Produit sans nom') continue;
            
            // Vérifier unicité
            const productKey = `${store}|${productName.toLowerCase()}`;
            if (seenProducts.has(productKey)) continue;
            
            // Vérification alimentaire avec confiance
            const foodCheck = isFoodProduct(productName);
            if (!foodCheck.isFood || foodCheck.confidence < 0.3) continue;

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
                category: categoryName,
                confidence: foodCheck.confidence
              });

              seenProducts.add(productKey);
              categoryCount++;
            }

            if (categoryCount >= maxPerCategory) break;
          }

          if (categoryCount > 0) {
            console.log(`   ✓ ${term}: ${categoryCount} produits`);
          }

        } catch (error: any) {
          if (error.code === 'ECONNABORTED') {
            console.log(`   ⏱️ Timeout: ${term}`);
          } else {
            console.error(`   ❌ Erreur: ${error.message}`);
          }
        }

        // Pause anti rate-limit
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

  } catch (error: any) {
    console.error(`❌ Erreur générale ${store}:`, error.message);
  }

  // Filtrer les promotions par confiance (garder seulement > 0.5)
  const filteredPromotions = promotions.filter(p => (p.confidence || 0) >= 0.5);

  console.log(`\n🎯 ${store}: ${filteredPromotions.length}/${promotions.length} produits (après filtrage)`);

  return filteredPromotions;
}

/**
 * Recherche ciblée optimisée
 */
export async function fetchTargetedPromotions(
  store: "IGA" | "Metro" | "Super-C",
  postalCode: string,
  productList: string[]
): Promise<Promotion[]> {
  console.log(`\n🎯 Recherche ciblée ${store}: ${productList.join(', ')}`);
  
  const promotions: Promotion[] = [];
  const seenProducts = new Set<string>();
  
  const today = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const product of productList) {
    const searchTerm = product.toLowerCase().trim();
    const url = `https://backflipp.wishabi.com/flipp/items/search?postal_code=${postalCode}&q=${encodeURIComponent(searchTerm)}`;
    
    try {
      const res = await axios.get(url, { headers, timeout: 6000 });
      const items = res.data.items || [];
      
      for (const item of items) {
        const productName = (item.name || item.title || '').trim();
        if (!productName) continue;
        
        const productKey = `${store}|${productName.toLowerCase()}`;
        if (seenProducts.has(productKey)) continue;
        
        const foodCheck = isFoodProduct(productName);
        if (!foodCheck.isFood || foodCheck.confidence < 0.3) continue;

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
            category: categorizeProduct(productName),
            confidence: foodCheck.confidence
          });

          seenProducts.add(productKey);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
    } catch (error: any) {
      console.error(`❌ Erreur "${product}":`, error.message);
    }
  }

  console.log(`✅ ${promotions.length} promotions trouvées`);
  return promotions;
}