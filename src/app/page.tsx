// app/page.tsx
'use client';

import React, { useState } from 'react';
import Chatbot from '@/app/components/Chatbot';

interface ComparisonResult {
  summary: {
    totalWalmart: number;
    totalMetro: number;
    totalSuperC: number;
    promotionsFoundWalmart: number;
    promotionsFoundMetro: number;
    promotionsFoundSuperC: number;
    bestStore: string;
    bestStoreReason: string;
    totalSavings: number;
    productsFound: number;
    totalProducts: number;
    totalPromotionalSavings: number;
  };
  comparisons: any[];
}

export default function HomePage() {
  const [comparedItems, setComparedItems] = useState<string[]>([]);

  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCompare = async (items: string[]) => {
    console.log('📦 Articles reçus:', items);
    setComparedItems(items);
    setIsLoading(true);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setComparisonResult(data);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la comparaison:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Données par défaut si pas de résultats
  const storePrices = comparisonResult ? [
    { 
      total: `${comparisonResult.summary.totalWalmart.toFixed(2)}$`, 
      logo: '/Walmart_logo.png', 
      isBestChoice: comparisonResult.summary.bestStore === 'Walmart',
      promos: comparisonResult.summary.promotionsFoundWalmart
    },
    { 
      total: `${comparisonResult.summary.totalSuperC.toFixed(2)}$`, 
      logo: '/Logo_SuperC.png', 
      isBestChoice: comparisonResult.summary.bestStore === 'Super C',
      promos: comparisonResult.summary.promotionsFoundSuperC
    },
    { 
      total: `${comparisonResult.summary.totalMetro.toFixed(2)}$`, 
      logo: '/Metro_logo.png', 
      isBestChoice: comparisonResult.summary.bestStore === 'Metro',
      promos: comparisonResult.summary.promotionsFoundMetro
    }
  ] : [
    { total: '0 $', logo: '/Walmart_logo.png', isBestChoice: false, promos: 0 },
    { total: '0 $', logo: '/Logo_SuperC.png', isBestChoice: false, promos: 0 },
    { total: '0 $', logo: '/Metro_logo.png', isBestChoice: false, promos: 0 }
  ];

  // Trouver le magasin le plus économique et les économies
  const bestStoreInfo = comparisonResult ? {
    name: comparisonResult.summary.bestStore,
    savings: comparisonResult.summary.totalSavings,
    total: comparisonResult.summary.bestStore === 'Walmart' 
      ? comparisonResult.summary.totalWalmart
      : comparisonResult.summary.bestStore === 'Super C'
      ? comparisonResult.summary.totalSuperC
      : comparisonResult.summary.totalMetro
  } : {
    name: '-',
    savings: 0,
    total: 0
  };

  // Produits les plus chers (top 3)
  const expensiveProducts = comparisonResult 
    ? comparisonResult.comparisons
        .filter(c => c.bestPrice !== null)
        .sort((a, b) => (b.bestPrice || 0) - (a.bestPrice || 0))
        .slice(0, 3)
        .map(c => c.originalProduct)
        .join(', ')
    : 'Framboises, Fromage Noir, Pâtes';

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#ffffff' }}>
      {/* Header Principal avec Titre et Avantages */}
      <div className="container-fluid py-5" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="text-center mb-5">
              <h1 className="display-5 mb-3" style={{ color: '#1a1a1a', fontWeight:'400' }}>
                Magasinez plus intelligentment avec Flipp et économisez jusqu'à 20% chaque semaine sur vos courses.
              </h1>
            </div>

            {/* Grille des avantages */}
            <div className="row g-4 justify-content-center">
              <div className="col-md-3 col-6 text-center">
                <div className="mb-3">
                  <div style={{ 
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img 
                      src="/temps.png" 
                      alt="Résultats rapides" 
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
                <div className="fw-bold" style={{ color: '#1a1a1a', fontSize: '1.1rem' }}>Résultats en moins</div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>de 1 minutes</div>
              </div>

              <div className="col-md-3 col-6 text-center">
                <div className="mb-3">
                  <div style={{ 
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img 
                      src="/savings.png" 
                      alt="Service gratuit" 
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
                <div className="fw-bold" style={{ color: '#1a1a1a', fontSize: '1.1rem' }}>Sans frais</div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>GRATUIT</div>
              </div>

              <div className="col-md-3 col-6 text-center">
                <div className="mb-3">
                  <div style={{ 
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img 
                      src="/rabais.png" 
                      alt="Grandes économies" 
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
                <div className="fw-bold" style={{ color: '#1a1a1a', fontSize: '1.1rem' }}>Des grandes</div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>économies</div>
              </div>

              <div className="col-md-3 col-6 text-center">
                <div className="mb-3">
                  <div style={{ 
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img 
                      src="/panier.png" 
                      alt="Meilleures offres" 
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
                <div className="fw-bold" style={{ color: '#1a1a1a', fontSize: '1.1rem' }}>Les meilleures</div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>offres pour vous</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Principale avec Chatbot et Comparaison */}
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="row g-4">
              
              {/* Colonne Gauche - Chatbot */}
              <div className="col-lg-7">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-0">
                    <Chatbot onCompare={handleCompare} />
                  </div>
                </div>
              </div>

              {/* Colonne Droite - Résultats et Comparaison */}
              <div className="col-lg-5">
                {/* Section Comparaison des Prix - Hauteur fixe pour éviter les sauts */}
                <div className="card border-0 shadow-sm mb-4" style={{ minHeight: '400px' }}>
                  <div className="card-header bg-white border-0 py-3">
                    <h6 className="mb-0 fw-bold">
                      {isLoading ? 'Recherche en cours...' : 'Comparaison des prix'}
                    </h6>
                  </div>
                  <div className="card-body d-flex flex-column">
                    {isLoading ? (
                      <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1">
                        <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
                          <span className="visually-hidden">Chargement...</span>
                        </div>
                        <p className="text-muted text-center">Recherche des meilleures offres...</p>
                      </div>
                    ) : (
                      <div className="flex-grow-1">
                        <div className="row g-3 mb-4">
                          {storePrices.map((store, index) => (
                            <div key={index} className="col-4">
                              <div className={`text-center p-3 border rounded position-relative ${store.isBestChoice && comparisonResult ? 'border-success border-2 pt-4' : ''}`}>
                                {/* Badge "Meilleur choix" */}
                                {store.isBestChoice && comparisonResult && (
                                  <div 
                                    className="position-absolute top-0 start-50 translate-middle badge text-white fw-bold px-2 py-1"
                                    style={{ 
                                      backgroundColor: '#198754',
                                      fontSize: '0.65rem',
                                      zIndex: 1,
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    Meilleur choix
                                  </div>
                                )}
                                
                                <div className="mb-2">
                                  <img 
                                    src={store.logo} 
                                    alt="Logo magasin"
                                    style={{ 
                                      height: '25px',
                                      width: 'auto',
                                      objectFit: 'contain'
                                    }}
                                  />
                                </div>
                                <div className="fw-bold fs-5" style={{ color: store.isBestChoice && comparisonResult ? '#198754' : '#1a1a1a' }}>
                                  {store.total}
                                </div>
                                {comparisonResult && store.promos > 0 && (
                                  <small className="text-muted">
                                    {store.promos} promo{store.promos > 1 ? 's' : ''}
                                  </small>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Analyse du panier - Toujours visible mais contenu conditionnel */}
                        <div className="bg-light rounded p-3 mt-auto">
                          <h6 className="fw-bold mb-3">📊 Analyse du panier</h6>
                          <div className="small">
                            <div className="mb-2">
                              <span className="fw-semibold">Magasin le plus avantageux:</span>
                              <span className="ms-2 fw-bold" style={{ color: comparisonResult ? '#198754' : '#6c757d' }}>
                                {comparisonResult ? bestStoreInfo?.name : 'Walmart'}
                              </span>
                            </div>
                            <div className="mb-2">
                              <span className="fw-semibold">Économisez jusqu'à:</span>
                              <span className="ms-2 fw-bold" style={{ color: comparisonResult ? '#198754' : '#6c757d' }}>
                                {comparisonResult ? `${bestStoreInfo?.savings.toFixed(2)}$` : '6,80$'}
                              </span>
                            </div>
                            {comparisonResult && (
                              <>
                                <div className="mb-2">
                                  <span className="fw-semibold">Produits trouvés:</span>
                                  <span className="ms-2">
                                    {comparisonResult.summary.productsFound}/{comparisonResult.summary.totalProducts}
                                  </span>
                                </div>
                                {comparisonResult.summary.totalPromotionalSavings > 0 && (
                                  <div className="mb-2 text-success">
                                    <span className="fw-semibold">💰 Économie vs prix régulier:</span>
                                    <span className="ms-2 fw-bold">
                                      {comparisonResult.summary.totalPromotionalSavings.toFixed(2)}$
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="text-muted mt-2">
                              <span className="fw-semibold">Produits les plus chers:</span>
                              <br />
                              {expensiveProducts}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Résumé du panier - Hauteur fixe */}
                <div className="card border-0 shadow-sm mt-3" style={{ minHeight: '180px' }}>
                  <div className="card-body d-flex flex-column">
                    <h6 className="fw-bold text-dark mb-3">📋 Résumé du panier</h6>
                    <div className="mb-3 flex-grow-1">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Total estimé:</span>
                        <span className="fw-bold text-dark">
                          {bestStoreInfo 
                            ? `${bestStoreInfo.total.toFixed(2)}$` 
                            : '35,99$'
                          }
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Magasin économique:</span>
                        <span className={`fw-bold ${comparisonResult ? 'text-success' : 'text-muted'}`}>
                          {bestStoreInfo?.name || 'Walmart'}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Économies totales estimées:</span>
                        <span className={`fw-bold ${comparisonResult ? 'text-success' : 'text-muted'}`}>
                          {bestStoreInfo 
                            ? `${bestStoreInfo.savings.toFixed(2)}$`
                            : '6,80$'
                          }
                        </span>
                      </div>
                    </div>

                    {comparisonResult ? (
                      <div className="alert alert-success py-2 px-3 mb-0" style={{ fontSize: '0.85rem' }}>
                        <strong>🎉 Super!</strong> Vous économisez{' '}
                        <strong>{bestStoreInfo?.savings.toFixed(2)}$</strong> en choisissant{' '}
                        <strong>{bestStoreInfo?.name}</strong>
                      </div>
                    ) : (
                      <div className="alert alert-success py-2 px-3 mb-0">
                        <strong>🎉 Super!</strong> Votre panier est prêt !
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Call-to-Action */}
      <div className="container-fluid py-5" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h3 className="fw-bold mb-3">Économisez auprès de plus de 2 000 magasins favoris.</h3>
              </div>
              <div className="col-md-4 text-end">
                <button className="btn btn-dark btn-lg px-4">
                  Voir les circulaires
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .card {
          border-radius: 12px;
        }
        .btn-dark {
          background-color: #2d3748;
          border-color: #2d3748;
        }
        .btn-dark:hover {
          background-color: #1a202c;
          border-color: #1a202c;
        }
      `}</style>
    </div>
  );
}