// lib/flyers.ts
/**
 * Service de récupération des promotions depuis l'API Flipp
 * Magasins supportés: Walmart, Super C, Metro
 * NOTE: L'API Flipp retourne TOUS les magasins, on filtre par merchant_id côté client
 */

import axios from "axios";

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface Promotion {
  product_name: string;
  store_name: "Walmart" | "Metro" | "Super C";
  old_price: number | null;
  new_price: number;
  start_date?: string;
  end_date?: string;
  flyer_id?: number;
  category?: string;
  confidence?: number;
}

interface FlippAPIResponse {
  items?: Array<{
    name?: string;
    title?: string;
    sale_price?: string;
    current_price?: string;
    price?: string;
    original_price?: string;
    flyer_id?: number;
    merchant_id?: number;
    merchant_name?: string;
  }>;
}

// ========================================
// CONFIGURATION
// ========================================

const API_CONFIG = {
  baseUrl: "https://backflipp.wishabi.com/flipp/items/search",
  headers: {
    "User-Agent": "GrocerySaver/2.0",
    "Accept": "application/json"
  },
  timeout: 8000,
  delayBetweenRequests: 500, // ms
  maxRetries: 2
};

// IDs des marchands Flipp (confirmés via l'API)
const MERCHANT_IDS: Record<string, number> = {
  "Walmart": 234,
  "Metro": 2269,
  "Super C": 2585
};

// ========================================
// CATÉGORIES ALIMENTAIRES
// ========================================

const FOOD_CATEGORIES = {
  // Produits laitiers
  dairy: [
    'lait', 'milk', 'fromage', 'cheese', 'beurre', 'butter',
    'yaourt', 'yogourt', 'yogurt', 'crème', 'cream'
  ],
  
  // Viandes
  meat: [
    'poulet', 'chicken', 'boeuf', 'beef', 'porc', 'pork',
    'viande', 'meat', 'bacon', 'jambon', 'ham'
  ],
  
  // Poissons
  fish: [
    'poisson', 'fish', 'saumon', 'salmon', 'thon', 'tuna',
    'crevette', 'shrimp', 'truite', 'trout'
  ],
  
  // Fruits
  fruits: [
    'pomme', 'apple', 'banane', 'banana', 'orange',
    'fraise', 'strawberry', 'raisin', 'grape'
  ],
  
  // Légumes
  vegetables: [
    'carotte', 'carrot', 'tomate', 'tomato', 'laitue', 'lettuce',
    'brocoli', 'broccoli', 'oignon', 'onion', 'patate', 'potato'
  ],
  
  // Boulangerie
  bakery: [
    'pain', 'bread', 'baguette', 'croissant', 'bagel'
  ],
  
  // Épicerie de base
  pantry: [
    'riz', 'rice', 'pâtes', 'pasta', 'huile', 'oil',
    'farine', 'flour', 'sucre', 'sugar', 'sel', 'salt'
  ],
  
  // Boissons
  beverages: [
    'jus', 'juice', 'eau', 'water', 'café', 'coffee',
    'thé', 'tea', 'lait', 'milk'
  ],
  
  // Surgelés
  frozen: [
    'pizza', 'légumes surgelés', 'frozen', 'crème glacée', 'ice cream'
  ],
  
  // Collations
  snacks: [
    'biscuit', 'cookie', 'chocolat', 'chocolate', 'chips'
  ]
} as const;

// ========================================
// MOTS-CLÉS À EXCLURE (NON-ALIMENTAIRE)
// ========================================

const EXCLUDE_KEYWORDS = [
  // Meubles
  'bed', 'furniture', 'meuble', 'lit', 'chaise', 'table', 'sofa',
  
  // Hygiène/Beauté
  'shampoo', 'shampooing', 'savon', 'soap', 'detergent',
  'déodorant', 'perfume', 'makeup', 'maquillage',
  
  // Nettoyage
  'papier toilette', 'toilet paper', 'serviette', 'towel',
  'javellisant', 'bleach', 'nettoyant', 'cleaner',
  
  // Électronique
  'phone', 'tablet', 'laptop', 'tv', 'television', 'watch', 'gps',
  'airpods', 'ipad', 'computer',
  
  // Vêtements
  'shirt', 'pants', 'shoes', 'souliers', 'vêtement', 'clothing',
  
  // Jouets et décorations
  'doll', 'poupée', 'slime', 'toy', 'jouet', 'gonflable', 
  'décorative', 'decorative', 'basket burger'
];

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Vérifie si un produit est alimentaire
 * @param productName - Nom du produit à vérifier
 * @returns Objet contenant isFood (boolean) et confidence (0-1)
 */
function isFoodProduct(productName: string): { isFood: boolean; confidence: number } {
  const name = productName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Vérifier les exclusions (priorité maximale)
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (name.includes(keyword.toLowerCase())) {
      return { isFood: false, confidence: 0 };
    }
  }

  // 2. Vérifier les catégories alimentaires
  let maxConfidence = 0;
  let hasMatch = false;

  for (const keywords of Object.values(FOOD_CATEGORIES)) {
    for (const keyword of keywords) {
      if (name.includes(keyword.toLowerCase())) {
        hasMatch = true;
        // Confiance basée sur la longueur du mot-clé (plus long = plus précis)
        const confidence = Math.min(1, keyword.length / 12);
        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }
  }

  return {
    isFood: hasMatch,
    confidence: Math.round(maxConfidence * 100) / 100
  };
}

/**
 * Attend un délai spécifié
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse le prix depuis une chaîne ou un nombre
 */
function parsePrice(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

// ========================================
// FONCTION PRINCIPALE
// ========================================

/**
 * Récupère les promotions d'un magasin depuis l'API Flipp
 * @param store - Nom du magasin (Walmart, Metro, Super C)
 * @param postalCode - Code postal pour localiser les promotions
 * @param maxPerCategory - Nombre max de produits par catégorie
 * @returns Liste des promotions trouvées
 */
export async function fetchFlippPromotions(
  store: "Walmart" | "Metro" | "Super C",
  postalCode: string,
  maxPerCategory: number = 15
): Promise<Promotion[]> {
  const targetMerchantId = MERCHANT_IDS[store];

  if (!targetMerchantId) {
    console.error(`❌ Magasin non supporté: ${store}`);
    return [];
  }

  console.log(`\n🔍 === RECHERCHE ${store.toUpperCase()} ===`);
  console.log(`🏪 Merchant ID: ${targetMerchantId}`);
  console.log(`📍 Code postal: ${postalCode}`);
  console.log(`🎯 Maximum par catégorie: ${maxPerCategory}`);

  const promotions: Promotion[] = [];
  const seenProducts = new Set<string>();

  try {
    // Dates de validité
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Catégories prioritaires (produits courants)
    const priorityCategories = ['dairy', 'meat', 'fruits', 'vegetables', 'bakery'];
    const otherCategories = Object.keys(FOOD_CATEGORIES)
      .filter(c => !priorityCategories.includes(c));
    const sortedCategories = [...priorityCategories, ...otherCategories];

    // Parcourir chaque catégorie
    for (const categoryName of sortedCategories) {
      const keywords = FOOD_CATEGORIES[categoryName as keyof typeof FOOD_CATEGORIES];
      let categoryCount = 0;

      console.log(`\n📦 Catégorie: ${categoryName}`);

      // Utiliser les 4 premiers mots-clés par catégorie
      for (const term of keywords.slice(0, 4)) {
        if (categoryCount >= maxPerCategory) {
          console.log(`   ⏭️ Limite atteinte pour ${categoryName}`);
          break;
        }

        // NE PAS FILTRER dans l'URL - l'API ignore ce paramètre
        const url = `${API_CONFIG.baseUrl}?postal_code=${postalCode}&q=${encodeURIComponent(term)}`;

        try {
          // Requête API avec retry
          let response: any = null;
          let attempt = 0;

          while (attempt < API_CONFIG.maxRetries) {
            try {
              response = await axios.get(url, {
                headers: API_CONFIG.headers,
                timeout: API_CONFIG.timeout
              });
              break;
            } catch (error: any) {
              attempt++;
              if (attempt >= API_CONFIG.maxRetries) {
                throw error;
              }
              console.log(`   ⚠️ Retry ${attempt}/${API_CONFIG.maxRetries} pour "${term}"`);
              await delay(1000 * attempt);
            }
          }

          if (!response) continue;

          // 🎯 FILTRER PAR MERCHANT_ID ICI (côté client)
          const allItems = response.data?.items || [];
          const items = allItems.filter((item: any) => item.merchant_id === targetMerchantId);

          console.log(`   🔎 "${term}": ${allItems.length} total → ${items.length} pour ${store}`);

          // Traiter chaque item FILTRÉ
          for (const item of items) {
            const productName = (item.name || item.title || '').trim();

            // Validations de base
            if (!productName || productName === 'Produit sans nom') continue;

            // Clé unique pour éviter les doublons
            const productKey = `${store}|${productName.toLowerCase()}`;
            if (seenProducts.has(productKey)) continue;

            // Parser les prix D'ABORD
            const salePrice = parsePrice(
              item.sale_price || item.current_price || item.price
            );
            const regularPrice = parsePrice(
              item.price || item.original_price
            );

            // Validation du prix (nourriture rarement > 100$)
            if (salePrice <= 0 || salePrice > 100) continue;

            // Vérifier si c'est un produit alimentaire
            const foodCheck = isFoodProduct(productName);
            if (!foodCheck.isFood || foodCheck.confidence < 0.35) continue;

            // Créer la promotion
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

            // Log du produit trouvé
            console.log(`      ✅ ${productName} - $${salePrice.toFixed(2)}`);

            if (categoryCount >= maxPerCategory) break;
          }
        } catch (error: any) {
          if (error.code !== 'ECONNABORTED') {
            console.error(`   ❌ Erreur "${term}": ${error.message}`);
          }
        }

        // Délai entre les requêtes pour éviter le rate limiting
        await delay(API_CONFIG.delayBetweenRequests);
      }
    }
  } catch (error: any) {
    console.error(`❌ Erreur générale ${store}:`, error.message);
  }

  // Filtrer les promotions avec confiance suffisante
  const filteredPromotions = promotions.filter(p => (p.confidence || 0) >= 0.3);

  console.log(`\n🎯 === RÉSULTATS ${store.toUpperCase()} ===`);
  console.log(`   📊 Total trouvés: ${promotions.length}`);
  console.log(`   ✅ Haute confiance: ${filteredPromotions.length}`);
  console.log(`   ❌ Filtrés: ${promotions.length - filteredPromotions.length}`);

  return filteredPromotions;
}

// ========================================
// RECHERCHE CIBLÉE
// ========================================

/**
 * Recherche des promotions pour une liste spécifique de produits
 * @param store - Nom du magasin
 * @param postalCode - Code postal
 * @param productList - Liste des produits à rechercher
 * @returns Liste des promotions correspondantes
 */
export async function fetchTargetedPromotions(
  store: "Walmart" | "Metro" | "Super C",
  postalCode: string,
  productList: string[]
): Promise<Promotion[]> {
  const targetMerchantId = MERCHANT_IDS[store];

  if (!targetMerchantId) {
    console.error(`❌ Magasin non supporté: ${store}`);
    return [];
  }

  console.log(`\n🎯 === RECHERCHE CIBLÉE ${store.toUpperCase()} ===`);
  console.log(`📝 Produits: ${productList.join(', ')}`);

  const promotions: Promotion[] = [];
  const seenProducts = new Set<string>();

  const today = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  for (const product of productList) {
    const searchTerm = product.toLowerCase().trim();
    
    // NE PAS FILTRER dans l'URL
    const url = `${API_CONFIG.baseUrl}?postal_code=${postalCode}&q=${encodeURIComponent(searchTerm)}`;

    try {
      const response = await axios.get(url, {
        headers: API_CONFIG.headers,
        timeout: API_CONFIG.timeout
      });

      // 🎯 FILTRER PAR MERCHANT_ID ICI
      const allItems = response.data?.items || [];
      const items = allItems.filter((item: any) => item.merchant_id === targetMerchantId);

      console.log(`   🔎 "${product}": ${allItems.length} total → ${items.length} pour ${store}`);

      for (const item of items) {
        const productName = (item.name || item.title || '').trim();
        if (!productName) continue;

        const productKey = `${store}|${productName.toLowerCase()}`;
        if (seenProducts.has(productKey)) continue;

        // Parser les prix
        const salePrice = parsePrice(
          item.sale_price || item.current_price || item.price
        );
        const regularPrice = parsePrice(
          item.price || item.original_price
        );

        // Validation du prix
        if (salePrice <= 0 || salePrice > 100) continue;

        // Vérifier si c'est alimentaire
        const foodCheck = isFoodProduct(productName);
        if (!foodCheck.isFood || foodCheck.confidence < 0.35) continue;

        promotions.push({
          product_name: productName,
          old_price: regularPrice > salePrice ? regularPrice : null,
          new_price: salePrice,
          store_name: store,
          flyer_id: item.flyer_id,
          start_date: today,
          end_date: endDate,
          confidence: foodCheck.confidence
        });

        seenProducts.add(productKey);
        console.log(`      ✅ ${productName} - $${salePrice.toFixed(2)}`);
      }

      await delay(API_CONFIG.delayBetweenRequests);
    } catch (error: any) {
      console.error(`   ❌ Erreur "${product}": ${error.message}`);
    }
  }

  console.log(`\n✅ ${promotions.length} promotions trouvées`);
  return promotions;
}