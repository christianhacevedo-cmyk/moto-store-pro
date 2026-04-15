import { collection, onSnapshot, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export const getCatalogWithCache = async (collectionName, onDataChange) => {
  // Try to get from cache first
  const cached = getCachedData(collectionName);
  if (cached) {
    onDataChange(cached);
  }

  // Set up real-time listener
  const unsubscribe = onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update cache with fresh data
      setCachedData(collectionName, products);
      
      // Notify component of changes
      onDataChange(products);
    },
    (error) => {
      console.error(`Error listening to ${collectionName}:`, error);
    }
  );

  return unsubscribe;
};

// New function for stock counts with cache + listener
export const getStockCountsWithCache = (onCountsChange) => {
  // Try to get from cache first
  const cached = getCachedCounts();
  if (cached) {
    onCountsChange(cached);
  }

  // Local state to track counts as listeners update
  let currentCounts = cached || { cascos: 0, accesorios: 0, promociones: 0 };

  // Set up real-time listeners for all collections
  const unsubscribeCascos = onSnapshot(
    collection(db, 'proyectoCascos'),
    (snapshot) => {
      currentCounts.cascos = snapshot.docs.length;
      setCachedCounts(currentCounts);
      onCountsChange(currentCounts);
    }
  );

  const unsubscribeAccesorios = onSnapshot(
    collection(db, 'accesorios'),
    (snapshot) => {
      currentCounts.accesorios = snapshot.docs.length;
      setCachedCounts(currentCounts);
      onCountsChange(currentCounts);
    }
  );

  const unsubscribePromociones = onSnapshot(
    collection(db, 'promociones'),
    (snapshot) => {
      currentCounts.promociones = snapshot.docs.length;
      setCachedCounts(currentCounts);
      onCountsChange(currentCounts);
    }
  );

  // Return cleanup function
  return () => {
    unsubscribeCascos();
    unsubscribeAccesorios();
    unsubscribePromociones();
  };
};

const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(`catalog_${key}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`catalog_${key}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    localStorage.setItem(
      `catalog_${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now()
      })
    );
  } catch (error) {
    console.error('Cache save error:', error);
  }
};

// Stock counts cache functions
const getCachedCounts = () => {
  try {
    const cached = localStorage.getItem('stock_counts');
    if (!cached) return { cascos: 0, accesorios: 0, promociones: 0 };

    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem('stock_counts');
      return { cascos: 0, accesorios: 0, promociones: 0 };
    }

    return data;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return { cascos: 0, accesorios: 0, promociones: 0 };
  }
};

const setCachedCounts = (data) => {
  try {
    localStorage.setItem(
      'stock_counts',
      JSON.stringify({
        data,
        timestamp: Date.now()
      })
    );
  } catch (error) {
    console.error('Cache save error:', error);
  }
};

// Clear specific cache
export const clearCache = (collectionName) => {
  localStorage.removeItem(`catalog_${collectionName}`);
};

// Clear all caches
export const clearAllCache = () => {
  Object.keys(localStorage)
    .filter(key => key.startsWith('catalog_') || key === 'stock_counts')
    .forEach(key => localStorage.removeItem(key));
};
