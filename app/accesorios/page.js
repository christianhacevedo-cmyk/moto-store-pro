'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import Header from '@/components/Header';
import { getCatalogWithCache } from '@/lib/catalogCache';
import styles from '../catalogo.module.css';

export default function Accesorios() {
  const [accesorios, setAccesorios] = useState([]);
  const [filteredAccesorios, setFilteredAccesorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  const [filters, setFilters] = useState({
    nombre: '',
    tipo: '',
    priceMax: 500
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleAccesoriosData = (data) => {
      data.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      
      setAccesorios(data);
      setFilteredAccesorios(data);
      setLoading(false);
    };

    // Use cache + real-time listener
    const unsubscribe = getCatalogWithCache('accesorios', handleAccesoriosData);
    
    return () => {
      if (unsubscribe instanceof Function) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let filtered = [...accesorios];

    if (filters.nombre) {
      filtered = filtered.filter(a => a.nombre?.toLowerCase().includes(filters.nombre.toLowerCase()));
    }

    if (filters.tipo) {
      filtered = filtered.filter(a => a.tipo?.toLowerCase().includes(filters.tipo.toLowerCase()));
    }

    if (filters.priceMax) {
      filtered = filtered.filter(a => a.precio <= filters.priceMax);
    }

    filtered.sort((a, b) => (a.orden || 0) - (b.orden || 0));
    setFilteredAccesorios(filtered);
  }, [filters, accesorios]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ nombre: '', tipo: '', priceMax: 500 });
  };

  const uniqueTipos = [...new Set(accesorios.map(a => a.tipo).filter(Boolean))];

  return (
    <>
      <Header />
      <main className={styles.catalogContainer}>
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Accesorios de Carreras</h1>
            <p className={styles.heroSubtitle}>
              Complementos profesionales para tu equipamiento de racing
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
                  placeholder="Buscar accesorio..."
                  value={filters.nombre}
                  onChange={handleFilterChange}
                  className={styles.filterInput}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Tipo</label>
                <select 
                  name="tipo" 
                  value={filters.tipo}
                  onChange={handleFilterChange}
                  className={styles.filterSelect}
                >
                  <option value="">Todos los tipos</option>
                  {uniqueTipos.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
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
                {filteredAccesorios.length} {filteredAccesorios.length === 1 ? 'producto' : 'productos'}
              </h2>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Cargando accesorios...</p>
              </div>
            ) : filteredAccesorios.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>❌ No hay accesorios disponibles con esos filtros</p>
                <button 
                  onClick={resetFilters}
                  className={styles.emptyButton}
                >
                  Ver todos
                </button>
              </div>
            ) : (
              <div className={styles.productsGrid}>
                {filteredAccesorios.map((accesorio) => (
                  <div 
                    key={accesorio.id}
                    className={styles.cardWrapper}
                    style={{
                      borderRadius: '12px',
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(255, 145, 89, 0.2)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <img 
                      src={accesorio.imagen || 'https://via.placeholder.com/300x300'} 
                      alt={accesorio.nombre}
                      style={{
                        width: '100%',
                        height: '250px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '12px'
                      }}
                    />
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{accesorio.nombre}</h3>
                    {accesorio.tipo && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 8px 0' }}>{accesorio.tipo}</p>}
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#ff9159' }}>S/.{accesorio.precio}</div>
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
