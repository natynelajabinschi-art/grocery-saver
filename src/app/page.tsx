//app/pages.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Calendar, Award, History } from 'lucide-react';

interface UserStats {
  totalSearches: number;
  totalSavings: number;
  favoriteStore: 'IGA' | 'Metro' | null;
  lastSearch: string | null;
}

export default function StatsPanel() {
  const [stats, setStats] = useState<UserStats>({
    totalSearches: 0,
    totalSavings: 0,
    favoriteStore: null,
    lastSearch: null,
  });
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    // Charger les stats depuis localStorage
    try {
      const savedStats = localStorage.getItem('smartshopper_user_stats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnnualSavings = () => {
    // Estimation basée sur une recherche par semaine
    if (stats.totalSearches === 0) return 0;
    const avgSavingsPerSearch = stats.totalSavings / stats.totalSearches;
    return Math.round(avgSavingsPerSearch * 52 * 100) / 100;
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition z-50"
        title="Voir mes statistiques"
      >
        <TrendingUp size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl p-6 w-96 z-50 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Award className="text-yellow-500" size={24} />
          Vos Statistiques
        </h3>
        <button
          onClick={() => setShowPanel(false)}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        {/* Total des économies */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={20} />
            <span className="text-sm opacity-90">Économies totales</span>
          </div>
          <div className="text-3xl font-bold">
            ${stats.totalSavings.toFixed(2)}
          </div>
          <div className="text-xs opacity-75 mt-1">
            ~${getAnnualSavings()} par an
          </div>
        </div>

        {/* Nombre de recherches */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700">
              <ShoppingBag size={20} />
              <span className="font-medium">Recherches effectuées</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">
              {stats.totalSearches}
            </span>
          </div>
        </div>

        {/* Magasin favori */}
        {stats.favoriteStore && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-700">
                <Award size={20} />
                <span className="font-medium">Magasin préféré</span>
              </div>
              <span className="text-xl font-bold text-purple-600">
                {stats.favoriteStore}
              </span>
            </div>
            <p className="text-xs text-purple-600 mt-2">
              Meilleur prix la plupart du temps
            </p>
          </div>
        )}

        {/* Dernière recherche */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-700 mb-1">
            <Calendar size={18} />
            <span className="text-sm font-medium">Dernière recherche</span>
          </div>
          <p className="text-sm text-gray-600">
            {formatDate(stats.lastSearch)}
          </p>
        </div>

        {/* Économie moyenne */}
        {stats.totalSearches > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600 px-2">
            <span>Économie moyenne</span>
            <span className="font-semibold text-green-600">
              ${(stats.totalSavings / stats.totalSearches).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Badges de réussite */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
          <Award size={16} className="text-yellow-500" />
          Badges débloqués
        </h4>
        <div className="flex gap-2 flex-wrap">
          {stats.totalSearches >= 1 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              🎯 Premier pas
            </span>
          )}
          {stats.totalSearches >= 5 && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
              🔥 Régulier
            </span>
          )}
          {stats.totalSavings >= 10 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              💰 Économe
            </span>
          )}
          {stats.totalSavings >= 50 && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
              🏆 Expert
            </span>
          )}
          {stats.totalSearches >= 10 && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
              ⭐ Fidèle
            </span>
          )}
        </div>
      </div>

      {/* Bouton réinitialiser */}
      <button
        onClick={() => {
          if (confirm('Voulez-vous réinitialiser vos statistiques ?')) {
            localStorage.removeItem('smartshopper_user_stats');
            setStats({
              totalSearches: 0,
              totalSavings: 0,
              favoriteStore: null,
              lastSearch: null,
            });
          }
        }}
        className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 py-2"
      >
        Réinitialiser les statistiques
      </button>
    </div>
  );
}

/**
 * Composant mini pour afficher les stats en haut de page
 */
export function StatsBar() {
  const [stats, setStats] = useState<UserStats>({
    totalSearches: 0,
    totalSavings: 0,
    favoriteStore: null,
    lastSearch: null,
  });

  useEffect(() => {
    try {
      const savedStats = localStorage.getItem('smartshopper_user_stats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  }, []);

  if (stats.totalSearches === 0) return null;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <ShoppingBag size={16} className="text-blue-600" />
            <span className="text-gray-600">{stats.totalSearches} recherches</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign size={16} className="text-green-600" />
            <span className="font-semibold text-green-700">
              ${stats.totalSavings.toFixed(2)} économisés
            </span>
          </div>
        </div>
        {stats.favoriteStore && (
          <div className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
            🏆 {stats.favoriteStore}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook pour mettre à jour les stats après une comparaison
 */
export function useUpdateStats() {
  return (result: any) => {
    try {
      const savedStats = localStorage.getItem('smartshopper_user_stats');
      const stats = savedStats ? JSON.parse(savedStats) : {
        totalSearches: 0,
        totalSavings: 0,
        favoriteStore: null,
        lastSearch: null,
      };

      const newStats = {
        totalSearches: stats.totalSearches + 1,
        totalSavings: stats.totalSavings + (result.summary?.savings || 0),
        favoriteStore: result.summary?.bestStore || stats.favoriteStore,
        lastSearch: new Date().toISOString(),
      };

      localStorage.setItem('smartshopper_user_stats', JSON.stringify(newStats));
    } catch (error) {
      console.error('Erreur mise à jour stats:', error);
    }
  };
}