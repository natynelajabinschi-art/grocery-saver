// app/page.tsx
'use client';

import React, { useState } from 'react';
import Chatbot from '@/app/components/Chatbot';

export default function HomePage() {
  const [comparedItems, setComparedItems] = useState<string[]>([]);

  const handleCompare = (items: string[]) => {
    console.log('📦 Articles reçus:', items);
    setComparedItems(items);
  };

  const removeItem = (index: number) => {
    setComparedItems(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllItems = () => {
    setComparedItems([]);
  };

  return (
    <div className="container-fluid py-4">
      {/* === HERO SECTION === */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card text-white border-0 shadow-lg" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)'
          }}>
            <div className="card-body py-5 text-center">
              <h1 className="display-4 fw-bold mb-3">🛒 SmartShopper</h1>
              <p className="lead mb-0 fs-4">
                Comparez instantanément les prix entre IGA et Metro grâce à l'intelligence artificielle
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* === STATISTIQUES === */}
      <div className="row mb-5">
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm text-center h-100">
            <div className="card-body py-4">
              <div className="text-success mb-3 fs-1">💰</div>
              <h4 className="fw-bold text-success">25%</h4>
              <small className="text-muted">Économie moyenne</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm text-center h-100">
            <div className="card-body py-4">
              <div className="text-primary mb-3 fs-1">📦</div>
              <h4 className="fw-bold text-primary">500+</h4>
              <small className="text-muted">Produits comparés</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm text-center h-100">
            <div className="card-body py-4">
              <div className="text-warning mb-3 fs-1">⚡</div>
              <h4 className="fw-bold text-warning">Instant</h4>
              <small className="text-muted">Résultats</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm text-center h-100">
            <div className="card-body py-4">
              <div className="text-info mb-3 fs-1">🤖</div>
              <h4 className="fw-bold text-info">IA</h4>
              <small className="text-muted">Intelligente</small>
            </div>
          </div>
        </div>
      </div>

      {/* === CONTENU PRINCIPAL === */}
      <div className="row">
        {/* Colonne Chatbot */}
        <div className="col-lg-8 mb-4">
          <Chatbot onCompare={handleCompare} />
        </div>

        {/* Colonne Informations */}
        <div className="col-lg-4">
          {/* Instructions */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-bold text-primary">💡 Comment ça marche ?</h5>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-start mb-3">
                <span className="badge bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" 
                  style={{width: '30px', height: '30px'}}>1</span>
                <div>
                  <h6 className="fw-bold mb-1">Listez vos produits</h6>
                  <p className="text-muted mb-0 small">Dans le chat (ex: lait, pain, œufs)</p>
                </div>
              </div>
              <div className="d-flex align-items-start mb-3">
                <span className="badge bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" 
                  style={{width: '30px', height: '30px'}}>2</span>
                <div>
                  <h6 className="fw-bold mb-1">L'IA analyse</h6>
                  <p className="text-muted mb-0 small">Les prix chez IGA et Metro</p>
                </div>
              </div>
              <div className="d-flex align-items-start">
                <span className="badge bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" 
                  style={{width: '30px', height: '30px'}}>3</span>
                <div>
                  <h6 className="fw-bold mb-1">Économisez !</h6>
                  <p className="text-muted mb-0 small">Obtenez les meilleurs prix</p>
                </div>
              </div>
            </div>
          </div>

          {/* Panier Interactif */}
          {comparedItems.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold text-success">
                  🛒 Votre panier <span className="badge bg-success ms-2">{comparedItems.length}</span>
                </h5>
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={clearAllItems}
                >
                  Tout effacer
                </button>
              </div>
              <div className="card-body p-0">
                <div className="list-group list-group-flush">
                  {comparedItems.map((item, index) => (
                    <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <span className="badge bg-success rounded-circle me-3 d-flex align-items-center justify-content-center" 
                          style={{width: '25px', height: '25px', fontSize: '12px'}}>
                          {index + 1}
                        </span>
                        <span className="text-capitalize fw-medium">{item}</span>
                      </div>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeItem(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="card-footer bg-light text-center">
                  <button 
                    className="btn btn-success w-100 fw-bold py-2"
                    onClick={() => alert(`Comparaison lancée pour: ${comparedItems.join(', ')}`)}
                  >
                    📊 Lancer la comparaison
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Astuces */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0 fw-bold text-warning">✨ Astuces</h5>
            </div>
            <div className="card-body">
              <div className="d-flex mb-3">
                <span className="text-warning me-2">•</span>
                <small className="text-muted">
                  Utilisez des noms génériques (ex: "lait" plutôt que "lait Natrel 2%")
                </small>
              </div>
              <div className="d-flex mb-3">
                <span className="text-warning me-2">•</span>
                <small className="text-muted">
                  Séparez les produits par des virgules
                </small>
              </div>
              <div className="d-flex">
                <span className="text-warning me-2">•</span>
                <small className="text-muted">
                  Comparez plusieurs produits à la fois
                </small>
              </div>
            </div>
          </div>

          {/* Magasins */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0 fw-bold text-info">🏪 Magasins supportés</h5>
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-6">
                  <div className="border rounded p-3 text-center bg-light">
                    <div className="fw-bold text-primary fs-5">IGA</div>
                    <small className="text-muted">Supermarché</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="border rounded p-3 text-center bg-light">
                    <div className="fw-bold text-success fs-5">Metro</div>
                    <small className="text-muted">Grossiste</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}