'use client';
import styles from './HelmetCard.module.css';
import { useState } from 'react';
import Image from 'next/image';

export default function HelmetCard({ helmet, onSelect }) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        {!imageError && helmet.imagen ? (
          <img
            src={helmet.imagen}
            alt={helmet.nombre}
            className={styles.image}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeWidth="2" strokeLinecap="round" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" />
              <circle cx="15" cy="9" r="1.5" fill="currentColor" />
            </svg>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{helmet.nombre}</h3>
        
        <div className={styles.specs}>
          <div className={styles.specItem}>
            <span className={styles.specLabel}>Marca</span>
            <span className={styles.specValue}>{helmet.marca || 'N/A'}</span>
          </div>
          {helmet.tipo && (
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Tipo</span>
              <span className={styles.specValue}>{helmet.tipo}</span>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.price}>
            <span className={styles.priceValue}>S/.{helmet.precio || 0}</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => onSelect(helmet)}
          >
            Ver detalles
          </button>
        </div>
      </div>
    </div>
  );
}
