'use client';

import Link from 'next/link';
import styles from '../landing.module.css';

export default function CategoryCard({ 
  title, 
  description, 
  image, 
  href, 
  outOfStock = false 
}) {
  const handleClick = (e) => {
    if (outOfStock) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <Link href={outOfStock ? '#' : href} onClick={handleClick}>
      <div className={`${styles.categoryCard} ${outOfStock ? styles.outOfStock : ''}`}>
        <div className={styles.imageContainer}>
          <img 
            src={image} 
            alt={title}
            className={styles.categoryImage}
            loading="lazy"
          />
          <div className={styles.overlay}></div>
        </div>
        
        {outOfStock && (
          <div className={styles.outOfStockBadge}>Agotado</div>
        )}
        
        <div className={styles.cardContent}>
          <div>
            <h3 className={styles.categoryTitle}>
              {title}
              <span className={styles.arrow}>→</span>
            </h3>
            <p className={styles.categoryDescription}>
              {description}
            </p>
          </div>
          
          {outOfStock && (
            <div className={styles.outOfStockMessage}>
              ⚠️ Próxima reposición en breve
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
