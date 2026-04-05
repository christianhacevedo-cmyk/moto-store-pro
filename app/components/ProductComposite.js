'use client';

export default function ProductComposite({
  producto
}) {
  const img = producto?.imagenes?.[0] || producto?.imagen;
  const price = producto?.precio || 0;
  const name = producto?.nombre || 'Casco';

  return (
    <div
      style={{
        width: '100%',
        background: 'white',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Imagen */}
      <div
        style={{
          width: '100%',
          paddingBottom: '100%',
          position: 'relative',
          background: '#f9f9f9',
          overflow: 'hidden'
        }}
      >
        {img && (
          <img
            src={img}
            alt={name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}
      </div>

      {/* Info: Nombre y Precio */}
      <div style={{ padding: '16px' }}>
        <h3 style={{
          margin: 0,
          fontSize: 14,
          color: '#333',
          fontWeight: '600',
          marginBottom: 8,
          lineHeight: 1.3
        }}>
          {name}
        </h3>

        <p style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 'bold',
          color: '#1e7e34'
        }}>
          S/ {price.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
