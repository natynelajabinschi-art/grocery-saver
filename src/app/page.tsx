// app/page.tsx
'use client';

import React, { useState } from 'react';
import Chatbot from '@/app/components/Chatbot';

export default function HomePage() {
  // État pour stocker les articles à comparer
  const [comparedItems, setComparedItems] = useState<string[]>([]);

  // Fonction pour gérer la comparaison d'articles reçus du Chatbot
  const handleCompare = (items: string[]) => {
    console.log('📦 Articles reçus:', items);
    setComparedItems(items);
  };

  // Fonction pour supprimer un article spécifique du panier
  const removeItem = (index: number) => {
    setComparedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Fonction pour vider complètement le panier
  const clearAllItems = () => {
    setComparedItems([]);
  };

  return (
    <div className="container-fluid py-4">
      {/* 
        ====================
        SECTION HERO COMPACTE - En-tête principal
        ====================
      */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card  border-0" >
            <div className="card-body py-4 text-center">

              {/* Titre principal avec partie en jaune */}
              <h1 className="mb-3">
                Magasinez plus intelligemment avec Flipp et économisez jusqu’à 20 % chaque semaine sur vos courses.
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ====================
        SECTION STATISTIQUES - Chiffres clés
        ====================
      */}
      <div className="row mb-5">
        {/* Carte Économies moyennes */}
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm text-center h-100">
            <div className="card-body py-4">
              <div className="text-success mb-3 fs-1">💰</div>
              <h4 className="fw-bold text-success">30%</h4>
              <small className="text-muted">Économies moyennes</small>
            </div>
          </div>
        </div>

        {/* Carte Temps d'analyse */}
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm text-center h-100">
            <div className="card-body py-4">
              <div className="text-success mb-3 fs-1">⏱️</div>
              <h4 className="fw-bold text-success">5min</h4>
              <small className="text-muted">Temps d'analyse</small>
            </div>
          </div>
        </div>

        {/* Carte Comparaison temps réel */}
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm text-center h-100">
            <div className="card-body py-4">
              <div className="text-success mb-3 fs-1">⚡</div>
              <h4 className="fw-bold text-success">Temps réel</h4>
              <small className="text-muted">Comparaison</small>
            </div>
          </div>
        </div>

        {/* Carte Service gratuit */}
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm text-center h-100">
            <div className="card-body py-4">
              <div className="text-success mb-3 fs-1">🎯</div>
              <h4 className="fw-bold text-success">100%</h4>
              <small className="text-muted">Gratuit</small>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ====================
        CONTENU PRINCIPAL - Chatbot + Informations
        ====================
      */}
      <div className="row">
        {/* 
          COLONNE GAUCHE - Composant Chatbot
          ===================================
        */}
        <div className="col-lg-8 mb-4">
          {/* Intégration du composant Chatbot avec callback pour la comparaison */}
          <Chatbot onCompare={handleCompare} />
        </div>

        {/* 
          COLONNE DROITE - Panels d'information
          =====================================
        */}
        <div className="col-lg-4">
          {/* 
            PANEL: Comment ça fonctionne ?
            ------------------------------
          */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-bold text-success">Comment ça fonctionne ?</h5>
            </div>
            <div className="card-body">
              {/* Étape 1: Analyse Automatique */}
              <div className="d-flex align-items-start mb-3">
                <span className="badge rounded-circle me-3 d-flex align-items-center justify-content-center text-white" 
                  style={{width: '30px', height: '30px', backgroundColor: '#10b981'}}>1</span>
                <div>
                  <h6 className="fw-bold mb-1 text-success">Analyse Automatique</h6>
                  <p className="text-muted mb-0 small">
                    Téléchargez vos circulaires et notre IA extrait automatiquement tous les prix 
                    <span className="text-warning fw-bold"> (preview)</span>
                  </p>
                </div>
              </div>

              {/* Étape 2: Comparaison Intelligente */}
              <div className="d-flex align-items-start mb-3">
                <span className="badge rounded-circle me-3 d-flex align-items-center justify-content-center text-white" 
                  style={{width: '30px', height: '30px', backgroundColor: '#10b981'}}>2</span>
                <div>
                  <h6 className="fw-bold mb-1 text-success">Comparaison Intelligente</h6>
                  <p className="text-muted mb-0 small">Comparez les prix entre différents magasins en temps réel</p>
                </div>
              </div>

              {/* Étape 3: Listes de Courses */}
              <div className="d-flex align-items-start mb-3">
                <span className="badge rounded-circle me-3 d-flex align-items-center justify-content-center text-white" 
                  style={{width: '30px', height: '30px', backgroundColor: '#10b981'}}>3</span>
                <div>
                  <h6 className="fw-bold mb-1 text-success">Listes de Courses</h6>
                  <p className="text-muted mb-0 small">Créez vos listes et découvrez où faire les meilleures économies</p>
                </div>
              </div>

              {/* Étape 4: Assistant Chatbot */}
              <div className="d-flex align-items-start">
                <span className="badge rounded-circle me-3 d-flex align-items-center justify-content-center text-white" 
                  style={{width: '30px', height: '30px', backgroundColor: '#10b981'}}>4</span>
                <div>
                  <h6 className="fw-bold mb-1 text-success">Assistant Chatbot</h6>
                  <p className="text-muted mb-0 small">Un assistant intelligent pour vous guider et répondre à vos questions</p>
                </div>
              </div>
            </div>
          </div>

          {/* 
            PANEL: Magasins supportés
            --------------------------
          */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0 fw-bold text-success">Magasins supportés</h5>
            </div>
            <div className="card-body">
              <div className="row g-2">
                {/* Carte IGA */}
                <div className="col-4">
                  <div className="border rounded p-3 text-center bg-light">
                    <div className="fw-bold fs-5 text-success">Walmart</div>
                    <small className="text-muted">Supermarché</small>
                  </div>
                </div>
                {/* Carte Metro */}
                <div className="col-4">
                  <div className="border rounded p-3 text-center bg-light">
                    <div className="fw-bold fs-5 text-success">Metro</div>
                    <small className="text-muted">Grossiste</small>
                  </div>
                </div>
                 {/* Carte Super C */}
                <div className="col-4">
                  <div className="border rounded p-3 text-center bg-light">
                    <div className="fw-bold fs-5 text-success">Super C</div>
                    <small className="text-muted">Supermarché</small>
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