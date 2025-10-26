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
          {/* Carte hero compacte avec dégradé vert */}
          <div className="card text-white border-0 shadow-lg" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          }}>
            <div className="card-body py-4 text-center">
              {/* Logo et nom de l'application */}
              <div className="d-flex align-items-center justify-content-center mb-3">
                {/* Logo */}
                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                     style={{width: '60px', height: '60px'}}>
                  <span className="fs-3 fw-bold text-success">🛒</span>
                </div>
                <div className="text-start">
                  <h1 className="fw-bold mb-0" style={{fontSize: '2.5rem'}}>SmartShopper</h1>
                  <p className="text-light mb-0" style={{color: '#d1d5db'}}>Économisez intelligemment</p>
                </div>
              </div>

              {/* Message d'économies avec cercle */}
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="bg-warning rounded-circle d-flex align-items-center justify-content-center me-3" 
                     style={{width: '40px', height: '40px', minWidth: '40px'}}>
                  <span className="text-dark fw-bold">💰</span>
                </div>
                <h2 className="fw-bold fs-3 mb-0">Économisez jusqu'à 30% sur vos courses</h2>
              </div>
              
              {/* Titre principal avec partie en jaune */}
              <h1 className="display-5 fw-bold mb-3">
                Comparez les Prix{' '}
                <span style={{
                  color: '#FFD700',
                  textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                  background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Économisez Plus
                </span>
              </h1>
              
              {/* Sous-titre compact */}
              <p className="lead mb-0 fs-5">
                Analysez automatiquement les circulaires de vos magasins préférés et trouvez les meilleures offres avec l'aide de l'intelligence artificielle
              </p>
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
            PANEL: Panier Interactif (conditionnel)
            ---------------------------------------
            S'affiche uniquement s'il y a des articles à comparer
          */}
          {comparedItems.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold text-success">
                  Votre panier <span className="badge ms-2 text-white bg-success">{comparedItems.length}</span>
                </h5>
                {/* Bouton pour vider le panier */}
                <button 
                  className="btn btn-sm btn-success text-white"
                  onClick={clearAllItems}
                >
                  Tout effacer
                </button>
              </div>
              <div className="card-body p-0">
                {/* Liste des articles dans le panier */}
                <div className="list-group list-group-flush">
                  {comparedItems.map((item, index) => (
                    <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        {/* Numéro de l'article */}
                        <span className="badge rounded-circle me-3 d-flex align-items-center justify-content-center text-white bg-success" 
                          style={{width: '25px', height: '25px', fontSize: '12px'}}>
                          {index + 1}
                        </span>
                        {/* Nom de l'article */}
                        <span className="text-capitalize fw-medium">{item}</span>
                      </div>
                      {/* Bouton de suppression d'un article */}
                      <button 
                        className="btn btn-sm btn-success text-white"
                        onClick={() => removeItem(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {/* Pied de carte avec bouton d'action principal */}
                <div className="card-footer bg-light text-center">
                  <button 
                    className="btn btn-success w-100 fw-bold py-2 text-white"
                    onClick={() => alert(`Comparaison lancée pour: ${comparedItems.join(', ')}`)}
                  >
                    Lancer la comparaison
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 
            PANEL: Astuces d'utilisation
            -----------------------------
          */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0 fw-bold text-success">Astuces</h5>
            </div>
            <div className="card-body">
              {/* Astuce 1: Noms génériques */}
              <div className="d-flex mb-3">
                <span className="text-success me-2">•</span>
                <small className="text-muted">
                  Utilisez des noms génériques (ex: "lait" plutôt que "lait Natrel 2%")
                </small>
              </div>
              {/* Astuce 2: Séparation par virgules */}
              <div className="d-flex mb-3">
                <span className="text-success me-2">•</span>
                <small className="text-muted">
                  Séparez les produits par des virgules
                </small>
              </div>
              {/* Astuce 3: Comparaison multiple */}
              <div className="d-flex">
                <span className="text-success me-2">•</span>
                <small className="text-muted">
                  Comparez plusieurs produits à la fois
                </small>
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
                <div className="col-6">
                  <div className="border rounded p-3 text-center bg-light">
                    <div className="fw-bold fs-5 text-success">IGA</div>
                    <small className="text-muted">Supermarché</small>
                  </div>
                </div>
                {/* Carte Metro */}
                <div className="col-6">
                  <div className="border rounded p-3 text-center bg-light">
                    <div className="fw-bold fs-5 text-success">Metro</div>
                    <small className="text-muted">Grossiste</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 
            PANEL: Call-to-Action (CTA)
            ----------------------------
            Encourager l'utilisateur à commencer
          */}
          <div className="card border-0 shadow-sm mt-4 text-center text-white bg-success">
            <div className="card-body py-4">
              <h5 className="fw-bold mb-3">Prêt à économiser ?</h5>
              <p className="mb-3 small">
                Commencez dès maintenant et découvrez combien vous pouvez économiser sur vos courses.
              </p>
              {/* Bouton d'action principal */}
              <button className="btn btn-light fw-bold text-success">
                Commencer Maintenant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}