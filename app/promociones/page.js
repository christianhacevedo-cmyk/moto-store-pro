'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import Header from '@/components/Header';
import { getCatalogWithCache } from '@/lib/catalogCache';
import styles from '../catalogo.module.css';

export default function Promociones() {
  const [promociones, setPromociones] = useState([]);
  const [filteredPromociones, setFilteredPromociones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  const [filters, setFilters] = useState({
    nombre: '',
    priceMax: 500
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handlePromocionesData = (data) => {
      data.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      
      setPromociones(data);
      setFilteredPromociones(data);
      setLoading(false);
    };

    // Use cache + real-time listener
    const unsubscribe = getCatalogWithCache('promociones', handlePromocionesData);
    
    return () => {
      if (unsubscribe instanceof Function) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let filtered = [...promociones];

    if (filters.nombre) {
      filtered = filtered.filter(p => p.nombre?.toLowerCase().includes(filters.nombre.toLowerCase()));
    }

    if (filters.priceMax) {
      filtered = filtered.filter(p => p.precio <= filters.priceMax);
    }

    filtered.sort((a, b) => (a.orden || 0) - (b.orden || 0));
    setFilteredPromociones(filtered);
  }, [filters, promociones]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ nombre: '', priceMax: 500 });
  };

  return (
    <>
      <Header />
      <main className={styles.catalogContainer}>
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Promociones Especiales</h1>
            <p className={styles.heroSubtitle}>
              Ofertas exclusivas y descuentos imperdibles
            </p>
          </div>
        </div>

        <div className={styles.mainGrid}>
          <aside className={styles.sidebar}>
            <div className={styles.filterCard}>
              <h3 className={styles.filterTitle}>Filtros</h3>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Buscar</label>
                <input 
                  type="text" 
                  name="nombre" 
                  placeholder="Buscar promoción..."
                  value={filters.nombre}
                  onChange={handleFilterChange}
                  className={styles.filterInput}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Precio Máximo</label>
                <select 
                  name="priceMax" 
                  value={filters.priceMax}
                  onChange={handleFilterChange}
                  className={styles.filterSelect}
                >
                  <option value="500">Hasta S/ 500</option>
                  <option value="100">Hasta S/ 100</option>
                  <option value="200">Hasta S/ 200</option>
                  <option value="300">Hasta S/ 300</option>
                  <option value="400">Hasta S/ 400</option>
                </select>
              </div>

              <button 
                onClick={resetFilters}
                className={styles.resetBtn}
              >
                Limpiar Filtros
              </button>
            </div>

            {user?.email === 'admin@inracing.com' && (
              <Link href="/admin" className={styles.adminLink}>
                ⚙️ Panel Admin
              </Link>
            )}
          </aside>

          <section className={styles.productsSection}>
            <div className={styles.resultInfo}>
              <h2 className={styles.resultCount}>
                {filteredPromociones.length} {filteredPromociones.length === 1 ? 'promoción' : 'promociones'}
              </h2>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Cargando promociones...</p>
              </div>
            ) : filteredPromociones.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>❌ No hay promociones disponibles con esos filtros</p>
                <button 
                  onClick={resetFilters}
                  className={styles.emptyButton}
                >
                  Ver todas
                </button>
              </div>
            ) : (
              <div className={styles.productsGrid}>
                {filteredPromociones.map((promocion) => (
                  <div 
                    key={promocion.id}
                    className={styles.cardWrapper}
                    style={{
                      borderRadius: '12px',
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      border: '2px solid #ff9159',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 16px 32px rgba(255, 145, 89, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#ff9159',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      zIndex: 10
                    }}>
                      🔥 Oferta
                    </div>

                    <img 
                      src={promocion.imagen || 'https://via.placeholder.com/300x300'} 
                      alt={promocion.nombre}
                      style={{
                        width: '100%',
                        height: '250px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '12px'
                      }}
                    />
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{promocion.nombre}</h3>
                    {promocion.descripcion && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 8px 0' }}>{promocion.descripcion}</p>}
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#ff9159' }}>S/.{promocion.precio}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
