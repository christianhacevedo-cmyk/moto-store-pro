'use client';

export default function HomePage() {
  return (
    <div>
      <style>{`
        :root {
          --bg-primary: #0e0e0e;
          --bg-secondary: #1a1a1a;
          --text-primary: #ffffff;
          --text-secondary: #adaaaa;
          --primary: #ff9159;
          --primary-dark: #ff7a2f;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: 'Manrope', sans-serif;
        }
      `}</style>
      
      <header style={{
        background: 'linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary))',
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255, 145, 89, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg, #ff9159 0%, #ff7a2f 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            InRacing
          </h1>
          <nav style={{ display: 'flex', gap: '24px' }}>
            <a href="/" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>Inicio</a>
            <a href="/catalogo" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>Catálogo</a>
            <a href="/admin" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>Admin</a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section style={{
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
          padding: '80px 24px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 145, 89, 0.1)'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: 700,
              marginBottom: '24px',
              lineHeight: 1.1
            }}>
              Cascos Premium para Carreras
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              marginBottom: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px'
            }}>
              Protección de máxima performance con tecnología de punta.
              Diseñados para pilotos profesionales que no comprometen seguridad.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <a href="/catalogo" style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                color: '#531e00',
                textDecoration: 'none',
                borderRadius: '50px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-block',
                transition: 'all 0.3s ease'
              }}>
                Explorar Catálogo
              </a>
              <button style={{
                padding: '12px 24px',
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid rgba(255, 145, 89, 0.3)',
                borderRadius: '50px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                Ver Especificaciones
              </button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section style={{
          padding: '80px 24px',
          background: 'linear-gradient(135deg, rgba(255, 145, 89, 0.1) 0%, rgba(255, 122, 47, 0.05) 100%)',
          borderTop: '1px solid rgba(255, 145, 89, 0.1)',
          borderBottom: '1px solid rgba(255, 145, 89, 0.1)'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '32px'
            }}>
              {[
                { number: '500+', label: 'Pilotos Profesionales' },
                { number: '50+', label: 'Modelos Premium' },
                { number: '15', label: 'Años de Experiencia' },
                { number: '99.8%', label: 'Satisfacción' }
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, var(--primary) 0%, #f88d36 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '12px'
                  }}>
                    {stat.number}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          padding: '80px 24px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid rgba(255, 145, 89, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px' }}>
              ¿Listo para competir?
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              marginBottom: '32px'
            }}>
              Únete a los mejores pilotos que confían en InRacing
            </p>
            <a href="/catalogo" style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
              color: '#531e00',
              textDecoration: 'none',
              borderRadius: '50px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-block'
            }}>
              Comienza ahora
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
