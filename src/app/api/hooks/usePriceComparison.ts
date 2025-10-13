// hooks/usePriceComparison.ts - HOOK PERSONNALISÉ POUR COMPARAISON

import { useState, useCallback } from 'react';

export interface ComparisonResult {
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
  matches: any[];
  timestamp: string;
}

export interface UsePriceComparisonReturn {
  loading: boolean;
  error: string | null;
  results: ComparisonResult | null;
  compareProducts: (items: string[]) => Promise<void>;
  reset: () => void;
}

/**
 * Hook personnalisé pour la comparaison de prix
 */
export function usePriceComparison(): UsePriceComparisonReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ComparisonResult | null>(null);

  const compareProducts = useCallback(async (items: string[]) => {
    if (!items || items.length === 0) {
      setError('Veuillez fournir au moins un produit');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Erreur lors de la comparaison');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur réseau. Veuillez réessayer.');
      console.error('Erreur comparaison:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResults(null);
  }, []);

  return {
    loading,
    error,
    results,
    compareProducts,
    reset,
  };
}

/**
 * Hook pour le cache local (localStorage)
 */
export function useLocalCache(key: string, duration: number = 30 * 60 * 1000) {
  const getFromCache = useCallback((): any | null => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      if (Date.now() - timestamp > duration) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erreur lecture cache:', error);
      return null;
    }
  }, [key, duration]);

  const saveToCache = useCallback((data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Erreur sauvegarde cache:', error);
    }
  }, [key]);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Erreur nettoyage cache:', error);
    }
  }, [key]);

  return { getFromCache, saveToCache, clearCache };
}

/**
 * Hook pour l'historique des recherches
 */
export function useSearchHistory(maxItems: number = 10) {
  const HISTORY_KEY = 'smartshopper_search_history';

  const getHistory = useCallback((): string[][] => {
    try {
      const history = localStorage.getItem(HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }, []);

  const addToHistory = useCallback((items: string[]) => {
    try {
      const history = getHistory();
      const newHistory = [items, ...history.filter(h => 
        JSON.stringify(h) !== JSON.stringify(items)
      )].slice(0, maxItems);
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Erreur ajout historique:', error);
    }
  }, [getHistory, maxItems]);

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Erreur nettoyage historique:', error);
    }
  }, []);

  return { getHistory, addToHistory, clearHistory };
}

/**
 * Hook pour les statistiques utilisateur
 */
export function useUserStats() {
  const STATS_KEY = 'smartshopper_user_stats';

  const getStats = useCallback(() => {
    try {
      const stats = localStorage.getItem(STATS_KEY);
      return stats ? JSON.parse(stats) : {
        totalSearches: 0,
        totalSavings: 0,
        favoriteStore: null,
        lastSearch: null,
      };
    } catch {
      return {
        totalSearches: 0,
        totalSavings: 0,
        favoriteStore: null,
        lastSearch: null,
      };
    }
  }, []);

  const updateStats = useCallback((result: ComparisonResult) => {
    try {
      const stats = getStats();
      
      const newStats = {
        totalSearches: stats.totalSearches + 1,
        totalSavings: stats.totalSavings + result.summary.savings,
        favoriteStore: result.summary.bestStore,
        lastSearch: new Date().toISOString(),
      };

      localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
      return newStats;
    } catch (error) {
      console.error('Erreur mise à jour stats:', error);
      return stats;
    }
  }, [getStats]);

  const resetStats = useCallback(() => {
    try {
      localStorage.removeItem(STATS_KEY);
    } catch (error) {
      console.error('Erreur reset stats:', error);
    }
  }, []);

  return { getStats, updateStats, resetStats };
}

/**
 * Hook pour les favoris
 */
export function useFavorites() {
  const FAVORITES_KEY = 'smartshopper_favorites';

  const getFavorites = useCallback((): string[] => {
    try {
      const favorites = localStorage.getItem(FAVORITES_KEY);
      return favorites ? JSON.parse(favorites) : [];
    } catch {
      return [];
    }
  }, []);

  const addFavorite = useCallback((product: string) => {
    try {
      const favorites = getFavorites();
      if (!favorites.includes(product)) {
        const newFavorites = [...favorites, product];
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
        return newFavorites;
      }
      return favorites;
    } catch (error) {
      console.error('Erreur ajout favori:', error);
      return getFavorites();
    }
  }, [getFavorites]);

  const removeFavorite = useCallback((product: string) => {
    try {
      const favorites = getFavorites();
      const newFavorites = favorites.filter(f => f !== product);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      return newFavorites;
    } catch (error) {
      console.error('Erreur suppression favori:', error);
      return getFavorites();
    }
  }, [getFavorites]);

  const isFavorite = useCallback((product: string): boolean => {
    return getFavorites().includes(product);
  }, [getFavorites]);

  return { getFavorites, addFavorite, removeFavorite, isFavorite };
}