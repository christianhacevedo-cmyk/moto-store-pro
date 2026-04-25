// Esta ruta ya no se usa - la limpieza se hace directamente desde el cliente
export async function POST(req) {
  return new Response(JSON.stringify({ 
    error: 'Esta funcionalidad ha sido movida al cliente',
    mensaje: 'Use el botón de Limpiar Certificados en el panel de admin'
  }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  });
}
