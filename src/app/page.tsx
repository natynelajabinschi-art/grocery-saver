// app/page.tsx - VERSION FINALE OPTIMISÉE
'use client';

import React, { useState } from 'react';
import { ShoppingCart, TrendingDown, Sparkles, Store, Plus, X, Search, Award, DollarSign, AlertCircle } from 'lucide-react';

interface ComparisonResult {
  success: boolean;
  analysis: string;
  summary: {
    totalIga: number;
    totalMetro: number;
    bestStore: 'IGA' | 'Metro';
    savings: number;
    productsFound: number;
    totalProducts: number;
  };
  matches: ProductMatch[];
}

interface ProductMatch {
  originalProduct: string;
  iga: StoreData;
  metro: StoreData;
  bestStore: 'IGA' | 'Metro' | null;
  savings: number;
  matchQuality?: string;
}

interface StoreData {
  found: boolean;
  price?: number;
  productName?: string;
  hasPromotion?: boolean;
  confidence?: string;
}

export default function SmartShopperUI() {
  const [items, setItems] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => setItems([...items, '']);
  
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleCompare = async () => {
    const validItems = items.filter(item => item.trim());
    if (validItems.length === 0) {
      setError('Veuillez ajouter au moins un produit');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: validItems }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Impossible de comparer les produits');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl shadow-lg">
              <ShoppingCart className="text-white" size={32} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SmartShopper
            </h1>
          </div>
          <p className="text-gray-600 text-base sm:text-lg">
            Comparez IGA vs Metro et économisez instantanément 💰
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-red-800 font-semibold">Erreur</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="text-purple-600" size={24} />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Votre liste d'épicerie
            </h2>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  placeholder={`Produit ${index + 1} (ex: Lait 2%)`}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition text-gray-800"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCompare();
                    }
                  }}
                />
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition"
                    aria-label="Supprimer"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={addItem}
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-purple-500 hover:text-purple-600 transition"
            >
              <Plus size={20} />
              Ajouter un produit
            </button>
            
            <button
              onClick={handleCompare}
              disabled={loading || items.filter(i => i.trim()).length === 0}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Comparer les prix
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-6 animate-fadeIn">
            {/* Summary Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Winner Card */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={24} />
                  <span className="text-sm font-medium opacity-90">Meilleur choix</span>
                </div>
                <div className="text-3xl font-bold mb-1">{results.summary.bestStore}</div>
                <div className="text-sm opacity-90">
                  {results.summary.productsFound}/{results.summary.totalProducts} produits trouvés
                </div>
              </div>

              {/* Savings Card */}
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={24} />
                  <span className="text-sm font-medium opacity-90">Vous économisez</span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  ${results.summary.savings.toFixed(2)}
                </div>
                <div className="text-sm opacity-90">
                  ~${(results.summary.savings * 52).toFixed(0)} par an
                </div>
              </div>

              {/* Price Comparison Card */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={24} />
                  <span className="text-sm font-medium opacity-90">Prix totaux</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>IGA:</span>
                    <span className="font-bold">${results.summary.totalIga.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Metro:</span>
                    <span className="font-bold">${results.summary.totalMetro.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-2 rounded-lg">
                  <Sparkles className="text-purple-600" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Analyse IA</h3>
              </div>
              <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                {results.analysis}
              </div>
            </div>

            {/* Detailed Comparison */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <Store className="text-blue-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Comparaison détaillée</h3>
              </div>

              <div className="space-y-3">
                {results.matches.map((match, index) => (
                  <div
                    key={index}
                    className="border-2 border-gray-100 rounded-xl p-4 hover:border-purple-200 transition"
                  >
                    <div className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      {match.originalProduct}
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* IGA */}
                      {match.iga.found ? (
                        <div
                          className={`p-3 rounded-lg border-2 ${
                            match.bestStore === 'IGA'
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-700">🛒 IGA</span>
                            {match.iga.hasPromotion && (
                              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                                PROMO
                              </span>
                            )}
                          </div>
                          <div className="text-2xl font-bold text-gray-800">
                            ${match.iga.price?.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {match.iga.productName}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg border-2 border-gray-200 bg-gray-50">
                          <div className="font-semibold text-gray-700 mb-2">🛒 IGA</div>
                          <div className="text-sm text-gray-500">Non trouvé</div>
                        </div>
                      )}

                      {/* Metro */}
                      {match.metro.found ? (
                        <div
                          className={`p-3 rounded-lg border-2 ${
                            match.bestStore === 'Metro'
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-700">🛒 Metro</span>
                            {match.metro.hasPromotion && (
                              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                                PROMO
                              </span>
                            )}
                          </div>
                          <div className="text-2xl font-bold text-gray-800">
                            ${match.metro.price?.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {match.metro.productName}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg border-2 border-gray-200 bg-gray-50">
                          <div className="font-semibold text-gray-700 mb-2">🛒 Metro</div>
                          <div className="text-sm text-gray-500">Non trouvé</div>
                        </div>
                      )}
                    </div>

                    {match.savings > 0 && (
                      <div className="mt-3 text-center">
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                          <TrendingDown size={16} />
                          Économie: ${match.savings.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setResults(null);
                  setError(null);
                }}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                Nouvelle recherche
              </button>
              <button
                onClick={() => {
                  const text = `SmartShopper - Économie: $${results.summary.savings.toFixed(2)}\n\n${results.matches
                    .map(m => {
                      const bestPrice = m.bestStore === 'IGA' ? m.iga.price : m.metro.price;
                      return `${m.originalProduct}: ${m.bestStore || 'N/A'} - $${bestPrice?.toFixed(2) || 'N/A'}`;
                    })
                    .join('\n')}`;
                  
                  navigator.clipboard.writeText(text);
                  alert('Copié dans le presse-papier! 📋');
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
              >
                📋 Copier le résumé
              </button>
            </div>
          </div>
        )}

        {/* Tips Section */}
        {!results && !loading && (
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-6 border border-blue-200">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Sparkles size={20} className="text-purple-600" />
              💡 Conseils pour de meilleurs résultats
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Soyez spécifique: "Lait 2% 2L" plutôt que "Lait"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Ajoutez 5-10 produits pour une meilleure analyse</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>L'IA trouve automatiquement les meilleures promotions</span>
              </li>
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Économisez du temps et de l'argent avec SmartShopper 🚀</p>
          <p className="mt-1">Données mises à jour quotidiennement</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}