// app/page.tsx
'use client';

import React, { useState } from 'react';
import Chatbot from '@/app/components/Chatbot';
import { ShoppingCart, TrendingDown, Package, Star } from 'lucide-react';

export default function HomePage() {
  const [comparedItems, setComparedItems] = useState<string[]>([]);

  const handleCompare = (items: string[]) => {
    setComparedItems(items);
  };

  return (
    <div className="container-fluid py-4">
      {/* Hero Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white border-0 shadow-lg">
            <div className="card-body py-5 text-center">
              <h1 className="display-4 fw-bold mb-3">SmartShopper</h1>
              <p className="lead mb-0">
                Comparez instantanément les prix entre IGA et Metro grâce à l'intelligence artificielle
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="row">
        {/* Chatbot */}
        <div className="col-lg-8 mb-4">
          <Chatbot onCompare={handleCompare} />
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Instructions */}
          <div className="card border-0 shadow-sm mb-2">
            <div className="card-header bg-white">
              <h5 className="mb-0 fw-bold">💡 Comment ça marche ?</h5>
            </div>
            <div className="card-body">
              <ol className="mb-0 ps-3">
                <li className="mb-2">
                  <strong>Listez vos produits</strong> dans le chat (ex: lait, pain, œufs)
                </li>
                <li className="mb-2">
                  <strong>L'IA analyse</strong> les prix chez IGA et Metro
                </li>
                <li className="mb-2">
                  <strong>Obtenez les résultats</strong> et économisez!
                </li>
              </ol>
            </div>
          </div>

          {/* Recent Comparisons */}
          {comparedItems.length > 0 && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h5 className="mb-0 fw-bold">🛒 Votre panier</h5>
              </div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  {comparedItems.map((item, i) => (
                    <li key={i} className="list-group-item d-flex align-items-center">
                      <span className="badge bg-primary rounded-pill me-2">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-header bg-white">
              <h5 className="mb-0 fw-bold">✨ Astuces</h5>
            </div>
            <div className="card-body">
              <ul className="small mb-0">
                <li className="mb-2">Utilisez des noms génériques (ex: "lait" plutôt que "lait Natrel 2%")</li>
                <li className="mb-2">Séparez les produits par des virgules</li>
                <li className="mb-2">Comparez plusieurs produits à la fois pour maximiser vos économies</li>
              </ul>
            </div>
          </div>
          {/* Magasins supportés */}
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-header bg-white">
              <h5 className="mb-0 fw-bold">🛒 Magasins supportés</h5>
            </div>
            <div className="card-body">
              <ul className="small mb-0">
                <li className="mb-2">🏪 IGA</li>
                <li className="mb-2">🏪 Metro</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}