'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getLandingPageImages } from '@/lib/storageUrls';
import { getStockCountsWithCache } from '@/lib/catalogCache';
import Header from '@/components/Header';
import CategoryCard from '@/components/CategoryCard';
import styles from './landing.module.css';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        
        // Get images first (cached + parallel)
        const imageUrls = await getLandingPageImages();
        
        // Set up real-time listener for stock counts
        const handleCountsChange = (counts) => {
          setCategories([
            {
              id: 1,
              title: 'Cascos',
              description: 'Explora nuestro catálogo oficial de cascos',
              image: imageUrls.cascos,
              href: '/catalogo',
              stock: counts.cascos || 0,
              outOfStock: (counts.cascos || 0) === 0
            },
            {
              id: 2,
              title: 'Accesorios',
              description: 'Balaclava, guantes, candado de disco y más',
              image: imageUrls.accesorios,
              href: '/accesorios',
              stock: counts.accesorios || 0,
              outOfStock: (counts.accesorios || 0) === 0
            },
            {
              id: 3,
              title: 'Promociones',
              description: 'Ofertas especiales y descuentos exclusivos',
              image: imageUrls.promociones,
              href: '/promociones',
              stock: counts.promociones || 0,
              outOfStock: (counts.promociones || 0) === 0
            }
          ]);
          setLoading(false);
        };

        // Start real-time listener
        const unsubscribe = getStockCountsWithCache(handleCountsChange);
        
        return unsubscribe;
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([
          {
            id: 1,
            title: 'Cascos',
            description: 'Explora nuestro catálogo oficial de cascos',
            image: '',
            href: '/catalogo',
            stock: 0,
            outOfStock: true
          },
          {
            id: 2,
            title: 'Accesorios',
            description: 'Balaclava, guantes, candado de disco y más',
            image: '',
            href: '/accesorios',
            stock: 0,
            outOfStock: true
          },
          {
            id: 3,
            title: 'Promociones',
            description: 'Ofertas especiales y descuentos exclusivos',
            image: '',
            href: '/promociones',
            stock: 0,
            outOfStock: true
          }
        ]);
        setLoading(false);
      }
    };

    const unsubscribe = loadCategories();
    return () => {
      if (unsubscribe instanceof Function) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <>
      <Header />
      <main className={styles.landingContainer}>
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>InRacing Store</h1>
            <p className={styles.heroSubtitle}>
              Equipamiento profesional para pilotos y aficionados a las carreras
            </p>
          </div>
        </div>

        <div className={styles.productsSection}>
          <h2 className={styles.sectionTitle}>Categorías Principales</h2>
          
          <div className={styles.productsGrid}>
            {loading ? (
              <>
                <div className={styles.loadingCard}></div>
                <div className={styles.loadingCard}></div>
                <div className={styles.loadingCard}></div>
              </>
            ) : (
              categories.map(category => (
                <CategoryCard
                  key={category.id}
                  title={category.title}
                  description={category.description}
                  image={category.image}
                  href={category.href}
                  outOfStock={category.outOfStock}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
