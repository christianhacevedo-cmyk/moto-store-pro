'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Header.module.css';
import InRacingLogo from './InRacingLogo';

export default function Header() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Verificar usuario en localStorage
    const adminUser = localStorage.getItem('adminUser');
    if (adminUser) {
      try {
        const parsedUser = JSON.parse(adminUser);
        setUser(parsedUser);
      } catch (err) {
        console.error('Error parsing user:', err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    setUser(null);
    setMenuOpen(false);
    router.push('/login');
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/" className={styles.logoLink}>
            <InRacingLogo />
            <span className={styles.logoText}>InRacing</span>
          </Link>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Catálogo</Link>
          {user && (
            <Link href="/admin" className={styles.navLink}>Inventario</Link>
          )}
        </nav>

        <div className={styles.rightSection}>
          {user ? (
            <div className={styles.userMenu}>
              <span className={styles.userEmail}>{user.email}</span>
              <button
                className="btn btn-secondary"
                onClick={handleLogout}
              >
                Salir
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary">
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
