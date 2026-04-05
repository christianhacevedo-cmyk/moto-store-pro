'use client';
import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import Header from './components/Header';
import HelmetCard from './components/HelmetCard';
import styles from './page.module.css';

export default function Home() {
  const [helmets, setHelmets] = useState([]);
  const [featuredHelmets, setFeaturedHelmets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadHelmets = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'productos'), limit(6));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHelmets(data);
        setFeaturedHelmets(data.slice(0, 3));
      } catch (error) {
        console.error('Error loading helmets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHelmets();
  }, []);

  const handleSelectHelmet = (helmet) => {
    window.location.href = `/catalogo?id=${helmet.id}`;
  };

  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={`${styles.heroTitle} display-lg`}>
                Cascos Premium para Carreras
              </h1>
              <p className={`${styles.heroSubtitle} body-lg`}>
                Protección de máxima performance con tecnología de punta. 
                Diseñados para pilotos profesionales que no comprometen seguridad.
              </p>
              <div className={styles.heroCTA}>
                <Link href="/catalogo" className="btn btn-primary">
                  Explorar Catálogo
                </Link>
                <button className="btn btn-secondary">
                  Ver Especificaciones
                </button>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.heroGradient}></div>
              <div className={styles.heroDecoration}>
                <svg viewBox="0 0 200 200" fill="none">
                  <circle cx="100" cy="100" r="80" stroke="url(#gradient)" strokeWidth="2" opacity="0.3" />
                  <circle cx="100" cy="100" r="60" stroke="url(#gradient)" strokeWidth="2" opacity="0.2" />
                  <circle cx="100" cy="100" r="40" stroke="url(#gradient)" strokeWidth="2" opacity="0.1" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff9159" />
                      <stop offset="100%" stopColor="#ff7a2f" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Section */}
        <section className={styles.featured}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className="headline-lg">Destacados</h2>
                <p className="body-md text-secondary">
                  Los cascos más buscados por nuestros pilotos
                </p>
              </div>
              <Link href="/catalogo" className="btn btn-tertiary">
                Ver todo →
              </Link>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando cascos...</p>
              </div>
            ) : featuredHelmets.length > 0 ? (
              <div className="grid grid-3">
                {featuredHelmets.map((helmet) => (
                  <HelmetCard
                    key={helmet.id}
                    helmet={helmet}
                    onSelect={handleSelectHelmet}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No hay cascos disponibles en este momento.</p>
              </div>
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.stats}>
          <div className="container">
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>500+</div>
                <div className={styles.statLabel}>Pilotos Profesionales</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>50+</div>
                <div className={styles.statLabel}>Modelos Premium</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>15</div>
                <div className={styles.statLabel}>Años de Experiencia</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>99.8%</div>
                <div className={styles.statLabel}>Satisfacción</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.cta}>
          <div className="container">
            <div className={styles.ctaContent}>
              <h2 className="headline-lg">¿Listo para competir?</h2>
              <p className="body-lg text-secondary">
                Únete a los mejores pilotos que confían en InRacing
              </p>
              <Link href="/catalogo" className="btn btn-primary">
                Comienza ahora
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
