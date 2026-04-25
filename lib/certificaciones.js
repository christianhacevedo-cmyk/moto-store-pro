// Configuración de certificaciones con sus imágenes predefinidas
export const certificacionesConfig = {
  Logan: {
    nombre: 'Logan',
    imagen: '/certificaciones/Logan.svg',
    descripcion: 'Logan WA-202 FMVSS 218 ECE 22.06'
  },
  Xtreme: {
    nombre: 'Xtreme',
    imagen: '/certificaciones/Xtreme.svg',
    descripcion: 'Xtreme JH-902 DOT FMVSS 218'
  }
};

export const getCertificacionInfo = (nombre) => {
  return certificacionesConfig[nombre] || null;
};
