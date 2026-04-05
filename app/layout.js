import './globals.css';

export const metadata = {
  title: 'InRacing - Cascos Premium',
  description: 'Catálogo de cascos premium para pilotos profesionales',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
