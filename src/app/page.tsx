// app/page.tsx
'use client';

import React, { useState } from 'react';
import Chatbot from '@/app/components/Chatbot';

export default function HomePage() {
  // État pour stocker les articles à comparer
  const [comparedItems, setComparedItems] = useState<string[]>([]);
  const [postalCode, setPostalCode] = useState('J7M 1C7');

  // Fonction pour gérer la comparaison d'articles reçus du Chatbot
  const handleCompare = (items: string[]) => {
    console.log('📦 Articles reçus:', items);
    setComparedItems(items);
  };

  return (
    <div className="container-fluid py-4">
      {/* 
        ====================
        NAVIGATION - Style Flipp
        ====================
      */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white mb-4 border-bottom">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            <img 
              src="/images/flipp-app.png" 
              alt="Flipp" 
              style={{height: '50px'}}
            />
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item">
                <a className="nav-link fw-normal" href="#">Circulaires</a>
              </li>
              <li className="nav-item">
                <a className="nav-link fw-normal" href="#">Coupons</a>
              </li>
              <li className="nav-item">
                <a className="nav-link fw-normal" href="#">Liste d'achats</a>
              </li>
              <li className="nav-item">
                <a className="nav-link fw-normal" href="#">Recherche</a>
              </li>
              <li className="nav-item">
                <a className="nav-link fw-normal" href="#">Comparateur</a>
              </li>
            </ul>
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className="nav-link fw-normal" href="#">English</a>
              </li>
              <li className="nav-item">
                <a className="nav-link fw-normal" href="#">À propos</a>
              </li>
              <li className="nav-item">
                <a className="nav-link fw-normal" href="#">Application mobile Flipp</a>
              </li>
              <li className="nav-item">
                <a className="nav-link fw-normal" href="#">Blogue</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* 
        ====================
        SECTION HERO
        ====================
      */}
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="fw-normal mb-0" style={{fontSize: '2.2rem', lineHeight: '1.2'}}>
            Magasinez plus intelligemment avec Flipp et économisez jusqu'à 20 % chaque semaine sur vos courses.
          </h1>
        </div>
      </div>

      {/* 
        ====================
        SECTION 4 ICÔNES
        ====================
      */}
      <div className="row mb-5 text-center">
        <div className="col-md-3 col-6 mb-4">
          <div className="d-flex flex-column align-items-center">
            <div className="mb-4" style={{fontSize: '5rem'}}>
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h6 className="fw-normal mb-0" style={{fontSize: '0.95rem'}}>Résultats en moins</h6>
            <h6 className="fw-normal" style={{fontSize: '0.95rem'}}>de 3 minutes</h6>
          </div>
        </div>

        <div className="col-md-3 col-6 mb-4">
          <div className="d-flex flex-column align-items-center">
            <div className="mb-4" style={{fontSize: '5rem'}}>
              <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <text x="12" y="16" fontSize="14" fill="white" textAnchor="middle" fontWeight="bold">$</text>
              </svg>
            </div>
            <h6 className="fw-normal mb-0" style={{fontSize: '0.95rem'}}>Sans frais</h6>
            <h6 className="fw-bold" style={{fontSize: '0.95rem'}}>GRATUIT</h6>
          </div>
        </div>

        <div className="col-md-3 col-6 mb-4">
          <div className="d-flex flex-column align-items-center">
            <div className="mb-4" style={{fontSize: '5rem'}}>
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
              </svg>
            </div>
            <h6 className="fw-normal mb-0" style={{fontSize: '0.95rem'}}>Des grandes</h6>
            <h6 className="fw-normal" style={{fontSize: '0.95rem'}}>économies</h6>
          </div>
        </div>

        <div className="col-md-3 col-6 mb-4">
          <div className="d-flex flex-column align-items-center">
            <div className="mb-4" style={{fontSize: '5rem'}}>
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <h6 className="fw-normal mb-0" style={{fontSize: '0.95rem'}}>Les meilleures</h6>
            <h6 className="fw-normal" style={{fontSize: '0.95rem'}}>offres pour vous</h6>
          </div>
        </div>
      </div>

      {/* 
        ====================
        SECTION CODE POSTAL CENTRÉ
        ====================
      */}
      <div className="row mb-5">
        <div className="col-lg-8 mx-auto">
          <div className="p-5 rounded text-center" style={{backgroundColor: '#D6EEF7'}}>
            <p className="mb-4" style={{fontSize: '1.1rem', lineHeight: '1.5'}}>
              Saisissez votre code postal ci-dessous pour voir les plus récentes offres à proximité.
            </p>
            <div className="text-center">
              <input 
                type="text" 
                className="form-control text-center fw-bold border-0" 
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                style={{maxWidth: '200px', fontSize: '1.2rem', backgroundColor: 'white', margin: '0 auto', padding: '12px 20px', borderRadius: '20px'}}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 
        ====================
        SECTION PRINCIPALE - 2 COLONNES
        ====================
      */}
      <div className="row mb-4">
        {/* COLONNE GAUCHE - Chatbot */}
        <div className="col-lg-8 mb-4">
          <Chatbot onCompare={handleCompare} />
        </div>

        {/* COLONNE DROITE - Cartes magasins et analyse */}
        <div className="col-lg-4">
          {/* Meilleur prix label */}
          <div className="text-start mb-2">
            <small className="text-muted" style={{fontSize: '0.8rem'}}>Meilleur prix</small>
          </div>

          {/* Carte Walmart - Meilleur prix avec badge */}
          <div className="bg-white border rounded p-2 mb-2 text-center" style={{position: 'relative'}}>
            <div style={{position: 'absolute', top: '-8px', left: '10px'}}>
              <span className="badge rounded-pill text-white" style={{backgroundColor: '#4DD0E1', fontSize: '0.65rem', padding: '3px 10px'}}>
                Meilleur prix
              </span>
            </div>
            <img 
              src="/images/Walmart_logo_(2008).svg.png" 
              alt="Walmart" 
              className="img-fluid mb-1"
              style={{height: '20px', objectFit: 'contain'}}
            />
            <div className="fw-bold" style={{color: '#0071ce', fontSize: '1.1rem'}}>35,99 $</div>
          </div>

          {/* Carte Super C */}
          <div className="bg-white border rounded p-2 mb-2 text-center">
            <img 
              src="/images/Logo_SuperC.png" 
              alt="Super C" 
              className="img-fluid mb-1"
              style={{height: '20px', objectFit: 'contain'}}
            />
            <div className="fw-bold" style={{color: '#E74C3C', fontSize: '1.1rem'}}>38,95 $</div>
          </div>

          {/* Carte Metro */}
          <div className="bg-white border rounded p-2 mb-3 text-center">
            <img 
              src="/images/metro-logo.svg" 
              alt="Metro" 
              className="img-fluid mb-1"
              style={{height: '20px', objectFit: 'contain'}}
            />
            <div className="fw-bold" style={{color: '#E74C3C', fontSize: '1.1rem'}}>42,79 $</div>
          </div>

          {/* Analyse du panier */}
          <div className="bg-light p-3 rounded mb-3" style={{backgroundColor: '#F5F5F5'}}>
            <h6 className="fw-bold mb-2" style={{fontSize: '0.85rem'}}>Analyse du panier</h6>
            <p className="mb-1" style={{fontSize: '0.8rem'}}>Magasin le plus avantageux : <strong>Walmart</strong></p>
            <p className="mb-1" style={{fontSize: '0.8rem'}}>Économie totale : <strong>6,85 $</strong></p>
            <p className="mb-0" style={{fontSize: '0.8rem', color: '#666'}}>Produits les plus chers : Framboises, Fromage brie.</p>
          </div>

          {/* Économisez encore plus */}
          <div className="bg-white border rounded p-2 mb-3">
            <h6 className="fw-bold mb-2" style={{fontSize: '0.85rem'}}>💰 Économisez encore plus</h6>
            <div className="d-flex gap-2">
              <div className="flex-grow-1">
                <div className="border rounded p-2 text-center bg-light" style={{minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                  <div>
                    <p className="mb-1" style={{fontSize: '0.75rem', fontWeight: 'bold'}}>Remplacez le fromage</p>
                    <p className="mb-1" style={{fontSize: '0.7rem', color: '#999'}}>Président par une marque maison</p>
                  </div>
                  <div>
                    <p className="mb-1 fw-bold text-success" style={{fontSize: '0.85rem'}}>2,10 $</p>
                    <button className="btn btn-sm w-100 text-white" style={{backgroundColor: '#4DD0E1', fontSize: '0.7rem'}}>Remplacez</button>
                  </div>
                </div>
              </div>
              <div className="flex-grow-1">
                <div className="border rounded p-2 text-center bg-light" style={{minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                  <div>
                    <p className="mb-1" style={{fontSize: '0.75rem', fontWeight: 'bold'}}>Remplacez les framboises</p>
                    <p className="mb-1" style={{fontSize: '0.7rem', color: '#999'}}>pour des surgelées</p>
                  </div>
                  <div>
                    <p className="mb-1 fw-bold text-success" style={{fontSize: '0.85rem'}}>1,57 $</p>
                    <button className="btn btn-sm w-100 text-white" style={{backgroundColor: '#4DD0E1', fontSize: '0.7rem'}}>Remplacez</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Résumé du panier */}
          <div className="bg-light p-2 rounded">
            <h6 className="fw-bold mb-2" style={{fontSize: '0.85rem'}}>🛒 Résumé du panier</h6>
            <p className="mb-1" style={{fontSize: '0.75rem'}}>Total estimé : <strong>31,58 $</strong></p>
            <p className="mb-1" style={{fontSize: '0.75rem'}}>Magasin recommandé : <strong>Walmart</strong></p>
            <p className="mb-1" style={{fontSize: '0.75rem'}}>Économies totale estimées: <strong className="text-success">10,95 $</strong></p>
            
            <p className="mb-0" style={{fontSize: '0.75rem'}}>📋 Votre liste est prête !</p>
          </div>
        </div>
      </div>

      {/* 
        ====================
        SECTION CTA FINALE
        ====================
      */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center py-5 border-top">
            <div>
              <h2 style={{fontSize: '2rem', fontWeight: '700', lineHeight: '1.2'}}>
                Économisez auprès de plus<br />de 2 000 magasins favoris.
              </h2>
            </div>
            <div>
              <button className="btn btn-dark btn-lg px-5 py-3 rounded" style={{fontSize: '1rem', borderRadius: '8px'}}>
                Voir les circulaires
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ====================
        FOOTER - Style Flipp exact
        ====================
      */}
      <footer className="mt-5 py-5" style={{backgroundColor: '#424242', borderTop: '4px solid #00A0DC'}}>
        <div className="container">
          <div className="row">
            {/* Logo et réseaux sociaux */}
            <div className="col-md-2 mb-4">
              <img 
                src="/images/flipp-app.png" 
                alt="Flipp" 
                className="mb-3"
                style={{height: '50px'}}
              />
              <div className="d-flex gap-3 mt-3">
                <a href="#" className="text-white-50">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-white-50">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="text-white-50">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a href="#" className="text-white-50">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Plateforme de vente au détail */}
            <div className="col-md-3 mb-4">
              <h6 className="text-white mb-3">Plateforme de vente au détail</h6>
              <ul className="list-unstyled">
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Plateforme de médias</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Application mobile</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">À propos de nous</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Contactez-nous</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Aide</a></li>
              </ul>
            </div>

            {/* Carrières */}
            <div className="col-md-3 mb-4">
              <h6 className="text-white mb-3">Carrières</h6>
              <ul className="list-unstyled">
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Accès client</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Politique de Confidentialité</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Conditions d'utilisation</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Plan d'accessibilité</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Choix publicitaires</a></li>
              </ul>
            </div>
            
            {/* Blogue */}
            <div className="col-md-4 mb-4">
              <h6 className="text-white mb-3">Consultez le blogue de Flipp dès aujourd'hui</h6>
              <p className="text-white-50 mb-3 small">
                pour obtenir des conseils de magasinage, des inspirations quotidiennes 
                et des idées de projets au budget restreint.
              </p>
              <button className="btn btn-outline-light btn-sm rounded-pill px-4">
                Lire le blogue
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}