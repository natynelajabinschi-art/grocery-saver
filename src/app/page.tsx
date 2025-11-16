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
  const [postalCode, setPostalCode] = useState('J7M 1C7');
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
      total: `${comparisonResult.summary.totalMetro.toFixed(2)}$`, 
      logo: '/Metro_logo.png', 
      isBestChoice: comparisonResult.summary.bestStore === 'Metro',
      promos: comparisonResult.summary.promotionsFoundMetro
    },
    { 
      total: `${comparisonResult.summary.totalSuperC.toFixed(2)}$`, 
      logo: '/Logo_SuperC.png', 
      isBestChoice: comparisonResult.summary.bestStore === 'Super C',
      promos: comparisonResult.summary.promotionsFoundSuperC
    }
  ] : [
    { total: '-.--$', logo: '/Walmart_logo.png', isBestChoice: false, promos: 0 },
    { total: '-.--$', logo: '/Metro_logo.png', isBestChoice: false, promos: 0 },
    { total: '-.--$', logo: '/Logo_SuperC.png', isBestChoice: false, promos: 0 }
  ];

  // Trouver le magasin le plus économique et les économies
  const bestStoreInfo = comparisonResult ? {
    name: comparisonResult.summary.bestStore,
    savings: comparisonResult.summary.totalSavings,
    total: comparisonResult.summary.bestStore === 'Walmart' 
      ? comparisonResult.summary.totalWalmart
      : comparisonResult.summary.bestStore === 'Metro'
      ? comparisonResult.summary.totalMetro
      : comparisonResult.summary.totalSuperC
  } : null;

  // Produits les plus chers (top 3)
  const expensiveProducts = comparisonResult 
    ? comparisonResult.comparisons
        .filter(c => c.bestPrice !== null)
        .sort((a, b) => (b.bestPrice || 0) - (a.bestPrice || 0))
        .slice(0, 3)
        .map(c => c.originalProduct)
        .join(', ')
    : 'En attente...';

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#ffffff' }}>
      {/* Contenu Principal */}
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="row g-4">  
              {/* Header Principal */}
                <div className="container-fluid">
                  <div className="col-lg-12 justify-content-center" style={{ paddingLeft:'5rem', paddingRight:'5rem', marginTop: '4rem'}}>
                    {/* Titre Principal */}
                    <div className="text-start mb-4 mt-5">
                      <h1 className="fw-bold mb-3 text-center" style={{ color: '#1f2937', fontSize: '2.75rem', lineHeight: '1.3', fontWeight: '500!important' }}>
                        Magasinez plus intelligemment avec Flipp et économisez jusqu'à 20 % chaque semaine sur vos courses.
                      </h1>
                    </div>

                    {/* Icônes d'avantages - Style Flipp avec images */}
                    <div className="row g-4 mb-5 mt-5" >
                      <div className="col-md-3 col-6 text-center">
                        <div className="mb-2">
                          <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            margin: '0 auto',
                            borderRadius: '50%',
                            backgroundColor: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            <img 
                              src="/temps.png" 
                              alt="Résultats rapides" 
                              style={{
                                width: '45px',
                                height: '45px',
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                        </div>
                        <div className="fw-bold small">Résultats en moins</div>
                        <div className="small text-muted">de 3 minutes</div>
                      </div>

                      <div className="col-md-3 col-6 text-center">
                        <div className="mb-2">
                          <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            margin: '0 auto',
                            borderRadius: '50%',
                            backgroundColor: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            <img 
                              src="/savings.png" 
                              alt="Service gratuit" 
                              style={{
                                width: '45px',
                                height: '45px',
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                        </div>
                        <div className="fw-bold small">Sans frais</div>
                        <div className="small text-muted">GRATUIT</div>
                      </div>

                      <div className="col-md-3 col-6 text-center">
                        <div className="mb-2">
                          <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            margin: '0 auto',
                            borderRadius: '50%',
                            backgroundColor: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            <img 
                              src="/rabais.png" 
                              alt="Grandes économies" 
                              style={{
                                width: '45px',
                                height: '45px',
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                        </div>
                        <div className="fw-bold small">Des grandes</div>
                        <div className="small text-muted">économies</div>
                      </div>

                      <div className="col-md-3 col-6 text-center">
                        <div className="mb-2">
                          <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            margin: '0 auto',
                            borderRadius: '50%',
                            backgroundColor: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            <img 
                              src="/panier.png" 
                              alt="Meilleures offres" 
                              style={{
                                width: '45px',
                                height: '45px',
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                        </div>
                        <div className="fw-bold small">Les meilleures</div>
                        <div className="small text-muted">offres pour vous</div>
                      </div>
                    </div>
                  </div>
                </div>     
              {/* Colonne Gauche - Chatbot et Comparaison */}
              <div className="col-lg-8" >

                {/* Section Chatbot */}
                <div className="card border-0 shadow-sm mb-4 bg-white" style={{ minHeight: '600px', height: '600px', display: 'flex', flexDirection: 'column' }}>
                  <div className="card-body p-0">
                    <Chatbot onCompare={handleCompare} />
                  </div>
                </div>
              </div>

              {/* Colonne Droite - Économies et Résumé DYNAMIQUE */}
              <div className="col-lg-4">
                {/* Section Code Postal */}
                <div className="card border-0 shadow-sm" style={{ backgroundColor: '#d2eefb' }}>
                  <div className="card-body text-center pt-5">
                    <h6 className="fw-bold text-dark mb-3" style={{ fontSize: '0.95rem' }}>
                      Saisissez votre code postal ci-dessous pour voir les plus récentes offres à proximité.
                    </h6>
                    <div className="d-inline-block border rounded p-2 bg-white">
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="border-0 text-center fw-bold"
                        style={{ 
                          width: '100px', 
                          outline: 'none',
                          fontSize: '1rem',
                          color: '#1f2937'
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* Section Résumé du panier DYNAMIQUE */}
                <div className="card border-0 shadow-sm mt-3" style={{ backgroundColor: '#f8f8f8' }}>
                  <div className="card-body">
                    <h6 className="fw-bold text-dark mb-3">📋 Résumé du panier</h6>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-2 small">
                        <span className="text-muted">Total estimé:</span>
                        <span className="fw-bold text-dark">
                          {bestStoreInfo 
                            ? `${bestStoreInfo.total.toFixed(2)}$` 
                            : '-.--$'
                          }
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 small">
                        <span className="text-muted">Magasin économique:</span>
                        <span className={`fw-bold ${comparisonResult ? 'text-success' : 'text-muted'}`}>
                          {bestStoreInfo?.name || 'En attente...'}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between small">
                        <span className="text-muted">Économies totales estimées:</span>
                        <span className={`fw-bold ${comparisonResult ? 'text-success' : 'text-muted'}`}>
                          {bestStoreInfo 
                            ? `${bestStoreInfo.savings.toFixed(2)}$`
                            : '-.--$'
                          }
                        </span>
                      </div>
                    </div>

                    {comparisonResult && (
                      <div className="alert alert-success py-2 px-3 mb-2" style={{ fontSize: '0.85rem' }}>
                        <strong>🎉 Super!</strong> Vous économisez{' '}
                        <strong>{bestStoreInfo?.savings.toFixed(2)}$</strong> en choisissant{' '}
                        <strong>{bestStoreInfo?.name}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Comparaison des Prix DYNAMIQUE */}
                <div className="card border-0 shadow-sm mt-3" style={{ backgroundColor: '#f8f8f8' }}>
                  <div className="card-header border-bottom py-3">
                    <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                      {comparisonResult ? 'Meilleur prix trouvé' : 'Comparaison des prix'}
                    </h6>
                  </div>
                  <div className="card-body">
                    {isLoading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Chargement...</span>
                        </div>
                        <p className="mt-3 text-muted small">Recherche des meilleures offres...</p>
                      </div>
                    ) : (
                      <>
                        <div className="row g-2 mb-3">
                          {storePrices.map((store, index) => (
                            <div key={index} className="col-4 bg-white position-relative">
                              {/* Badge "Meilleur choix" */}
                              {store.isBestChoice && comparisonResult && (
                                <div 
                                  className="position-absolute top-0 start-50 translate-middle badge text-white fw-bold px-3 py-2"
                                  style={{ 
                                    backgroundColor: '#3b82f6',
                                    fontSize: '0.7rem',
                                    zIndex: 1,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  Meilleur choix
                                </div>
                              )}
                              
                              <div className={`border rounded p-3 text-center position-relative ${store.isBestChoice && comparisonResult ? 'pt-4' : ''}`}>
                                {/* Logo */}
                                <div className="mb-2 d-flex justify-content-center">
                                  <img 
                                    src={store.logo} 
                                    alt="Logo magasin"
                                    style={{ 
                                      height: '20px',
                                      width: '75px',
                                      objectFit: 'contain'
                                    }}
                                  />
                                </div>
                                
                                {/* Total */}
                                <div className="d-flex flex-column align-items-center">
                                  <h6 
                                    className={`fw-bold mb-0 ${store.isBestChoice && comparisonResult ? 'text-success' : 'text-dark'}`}
                                    style={{ fontSize: '0.9rem' }}
                                  >
                                    {store.total}
                                  </h6>
                                  {comparisonResult && store.promos > 0 && (
                                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                                      {store.promos} promo{store.promos > 1 ? 's' : ''}
                                    </small>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Analyse du panier DYNAMIQUE */}
                        {comparisonResult && (
                          <div className="bg-white rounded p-3 border">
                            <h6 className="fw-bold small mb-3" style={{ color: '#1f2937' }}>
                              📊 Analyse du panier
                            </h6>
                            <div className="small">
                              <div className="mb-2">
                                <span className="fw-semibold">Magasin le plus avantageux:</span>
                                <span className="ms-2 text-success fw-bold">
                                  {bestStoreInfo?.name || 'N/A'}
                                </span>
                              </div>
                              <div className="mb-2">
                                <span className="fw-semibold">Économisez jusqu'à:</span>
                                <span className="ms-2 text-success fw-bold">
                                  {bestStoreInfo ? `${bestStoreInfo.savings.toFixed(2)}$` : '0.00$'}
                                </span>
                              </div>
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
                              <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                                <span className="fw-semibold">Produits les plus chers:</span>
                                <br />
                                {expensiveProducts}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Message si pas de résultats */}
                        {!comparisonResult && !isLoading && (
                          <div className="text-center py-4 text-muted">
                            <p className="small mb-0">
                              🔍 Lancez une recherche pour voir les comparaisons de prix
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section Bas de page */}
            <div className="col-lg-10 bg-white mt-5">
              <div className="row align-items-center">
                {/* Texte à gauche */}
                <div className="col-md-8 col-12">
                  <div className="container-fluid mt-5 mb-5">
                    <h1 className="mb-0" style={{ color: '#1f2937', fontSize: '2.25rem', lineHeight: '1.3', fontWeight: '400!important' }}>Économisez auprès de plus de 2 000 magasins favoris.</h1>
                  </div>
                </div>
                
                {/* Bouton à droite */}
                <div className="col-md-4 col-12 text-center">
                  <button className="btn btn-dark btn-lg">
                    Voir les circulaires
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}