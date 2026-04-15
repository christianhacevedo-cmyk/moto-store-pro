'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import Header from '@/components/Header';
import HelmetCard from '@/components/HelmetCard';
import { CertificateBadge } from '@/components/CertificateBadges';
import { getCatalogWithCache } from '@/lib/catalogCache';
import styles from '../catalogo.module.css';

export default function Catalogo() {
  const [helmets, setHelmets] = useState([]);
  const [filteredHelmets, setFilteredHelmets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedHelmet, setSelectedHelmet] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hoveredHelmetId, setHoveredHelmetId] = useState(null);
  
  const [filters, setFilters] = useState({
    nombre: '',
    marca: '',
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
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        setSelectedImage(null);
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [showModal]);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  useEffect(() => {
    const handleArrowKeys = (e) => {
      if (!showImageLightbox || !selectedHelmet?.imagenes) return;
      
      if (e.key === 'ArrowLeft') {
        setCurrentImageIndex(prev => 
          prev === 0 ? selectedHelmet.imagenes.length - 1 : prev - 1
        );
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex(prev => 
          prev === selectedHelmet.imagenes.length - 1 ? 0 : prev + 1
        );
      } else if (e.key === 'Escape') {
        setShowImageLightbox(false);
      }
    };

    if (showImageLightbox) {
      window.addEventListener('keydown', handleArrowKeys);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleArrowKeys);
      document.body.style.overflow = 'unset';
    };
  }, [showImageLightbox, selectedHelmet, currentImageIndex]);

  useEffect(() => {
    const deduplicateHelmets = (helmets) => {
      const seen = new Set();
      const deduplicated = [];

      for (const helmet of helmets) {
        const key = `${helmet.nombre || ''}|${helmet.marca || ''}|${helmet.color || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(helmet);
        }
      }

      return deduplicated;
    };

    const handleHelmetsData = (data) => {
      data.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      const deduplicatedData = deduplicateHelmets(data);
      
      setHelmets(deduplicatedData);
      setFilteredHelmets(deduplicatedData);
      setLoading(false);
    };

    // Use cache + real-time listener
    const unsubscribe = getCatalogWithCache('proyectoCascos', handleHelmetsData);
    
    return () => {
      if (unsubscribe instanceof Function) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let filtered = [...helmets];

    if (filters.nombre) {
      filtered = filtered.filter(h => h.nombre?.toLowerCase().includes(filters.nombre.toLowerCase()));
    }

    if (filters.marca) {
      filtered = filtered.filter(h => h.marca?.toLowerCase().includes(filters.marca.toLowerCase()));
    }

    if (filters.tipo) {
      filtered = filtered.filter(h => h.tipo?.toLowerCase().includes(filters.tipo.toLowerCase()));
    }

    if (filters.priceMax) {
      filtered = filtered.filter(h => h.precio <= filters.priceMax);
    }

    filtered.sort((a, b) => (a.orden || 0) - (b.orden || 0));
    setFilteredHelmets(filtered);
  }, [filters, helmets]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ nombre: '', marca: '', tipo: '', priceMax: 500 });
  };

  const uniqueMarcas = [...new Set(helmets.map(h => h.marca).filter(Boolean))];
  const uniqueTipos = [...new Set(helmets.map(h => h.tipo).filter(Boolean))];

  return (
    <>
      <Header />
      <main className={styles.catalogContainer}>
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Catálogo Oficial de Cascos</h1>
            <p className={styles.heroSubtitle}>
              Explora nuestra colección premium de cascos para motociclismo de alto rendimiento
            </p>
          </div>
        </div>

        <div className={styles.mainGrid}>
          <aside className={styles.sidebar}>
            <div className={styles.filterCard}>
              <h3 className={styles.filterTitle}>Filtros</h3>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Buscar por Nombre</label>
                <input 
                  type="text" 
                  name="nombre" 
                  placeholder="Buscar casco..."
                  value={filters.nombre}
                  onChange={handleFilterChange}
                  className={styles.filterInput}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Marca</label>
                <select 
                  name="marca" 
                  value={filters.marca}
                  onChange={handleFilterChange}
                  className={styles.filterSelect}
                >
                  <option value="">Todas las marcas</option>
                  {uniqueMarcas.map(marca => (
                    <option key={marca} value={marca}>{marca}</option>
                  ))}
                </select>
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
                {filteredHelmets.length} {filteredHelmets.length === 1 ? 'producto' : 'productos'}
              </h2>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Cargando cascos...</p>
              </div>
            ) : filteredHelmets.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>❌ No hay cascos disponibles con esos filtros</p>
                <button 
                  onClick={resetFilters}
                  className={styles.emptyButton}
                >
                  Ver todos
                </button>
              </div>
            ) : (
              <div className={styles.productsGrid}>
                {filteredHelmets.map((helmet) => (
                  <div 
                    key={helmet.id}
                    onClick={() => {
                      setSelectedHelmet(helmet);
                      setSelectedImage(null);
                      setShowModal(true);
                    }}
                    className={styles.cardWrapper}
                    onMouseEnter={() => setHoveredHelmetId(helmet.id)}
                    onMouseLeave={() => setHoveredHelmetId(null)}
                    style={{
                      transform: hoveredHelmetId === helmet.id ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: hoveredHelmetId === helmet.id 
                        ? '0 16px 32px rgba(0, 0, 0, 0.15)' 
                        : '0 4px 12px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      borderRadius: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <HelmetCard 
                      helmet={helmet}
                      onSelect={() => {
                        setSelectedHelmet(helmet);
                        setShowModal(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {showModal && selectedHelmet && (
          <div className={styles.modal} onClick={() => setShowModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setShowModal(false)}
                className={styles.closeBtn}
              >
                ✕
              </button>

              <div className={styles.modalGrid}>
                <div className={styles.modalImageWrapper}>
                  <div className={styles.modalImage}>
                    <img 
                      src={selectedImage || selectedHelmet.imagen} 
                      alt={selectedHelmet.nombre}
                      className={styles.modalImg}
                    />
                  </div>

                  {selectedHelmet.certificados && selectedHelmet.certificados.length > 0 && (
                    <>
                      <h4 className={styles.certificatesTitle}>Certificaciones de Seguridad</h4>
                      <div className={styles.certificatesSection}>
                        {selectedHelmet.certificados.map((cert, idx) => (
                          <div key={idx}>
                            <CertificateBadge type={cert} size="large" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className={styles.modalInfo}>
                  <h2 className={styles.modalTitle}>{selectedHelmet.nombre}</h2>
                  
                  <div className={styles.modalPrice}>
                    S/.{selectedHelmet.precio}
                  </div>

                  {selectedHelmet.marca && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Marca:</span>
                      <span className={styles.specValue}>{selectedHelmet.marca}</span>
                    </div>
                  )}

                  {selectedHelmet.tipo && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Tipo:</span>
                      <span className={styles.specValue}>{selectedHelmet.tipo}</span>
                    </div>
                  )}

                  {selectedHelmet.color && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Color:</span>
                      <span className={styles.specValue}>{selectedHelmet.color}</span>
                    </div>
                  )}

                  {selectedHelmet.talla && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Talla:</span>
                      <span className={styles.specValue}>{selectedHelmet.talla}</span>
                    </div>
                  )}

                  {selectedHelmet.descripcion && (
                    <div className={styles.description}>
                      <h4 className={styles.descTitle}>Descripción</h4>
                      <p className={styles.descText}>{selectedHelmet.descripcion}</p>
                    </div>
                  )}

                  {selectedHelmet.imagenes && selectedHelmet.imagenes.length > 1 && (
                    <div className={styles.imageGallery}>
                      <h4 className={styles.galleryTitle}>Galería ({selectedHelmet.imagenes.length})</h4>
                      <div className={styles.thumbnails}>
                        {selectedHelmet.imagenes.map((img, idx) => (
                          <img 
                            key={idx}
                            src={img} 
                            alt={`${selectedHelmet.nombre} ${idx + 1}`}
                            className={`${styles.thumbnail} ${selectedImage === img ? styles.thumbnailActive : ''}`}
                            onClick={() => {
                              setSelectedImage(img);
                              setCurrentImageIndex(idx);
                              setShowImageLightbox(true);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    className={styles.ctaButton}
                    onClick={() => {
                      const message = `Hola, quiero consultar disponibilidad del casco: ${selectedHelmet.nombre}`;
                      const whatsappUrl = `https://wa.me/51922679150?text=${encodeURIComponent(message)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                  >
                    Consultar Disponibilidad
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showImageLightbox && selectedHelmet?.imagenes && selectedHelmet.imagenes.length > 0 && (
          <div className={styles.imageLightbox} onClick={() => setShowImageLightbox(false)}>
            <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setShowImageLightbox(false)}
                className={styles.lightboxClose}
              >
                ✕
              </button>

              <button 
                onClick={() => setCurrentImageIndex(prev => 
                  prev === 0 ? selectedHelmet.imagenes.length - 1 : prev - 1
                )}
                className={`${styles.lightboxNavButton} ${styles.prev}`}
              >
                ◀
              </button>

              <img 
                src={selectedHelmet.imagenes[currentImageIndex]} 
                alt={`${selectedHelmet.nombre} ${currentImageIndex + 1}`}
                className={styles.lightboxImage}
              />

              <button 
                onClick={() => setCurrentImageIndex(prev => 
                  prev === selectedHelmet.imagenes.length - 1 ? 0 : prev + 1
                )}
                className={`${styles.lightboxNavButton} ${styles.next}`}
              >
                ▶
              </button>

              <div className={styles.lightboxCounter}>
                {currentImageIndex + 1} / {selectedHelmet.imagenes.length}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
