// Configuración de certificaciones con sus imágenes predefinidas
export const certificacionesConfig = {
  DOT: {
    nombre: 'DOT',
    imagen: '/certificaciones/DOT.svg',
    descripcion: 'DOT FMVSS 218'
  },
  ECE: {
    nombre: 'ECE',
    imagen: '/certificaciones/ECE.svg',
    descripcion: 'ECE 22.05'
  },
  JIS: {
    nombre: 'JIS',
    imagen: '/certificaciones/JIS.svg',
    descripcion: 'JIS D.009'
  },
  SNELL: {
    nombre: 'SNELL',
    imagen: '/certificaciones/SNELL.svg',
    descripcion: 'SNELL M2020'
  }
};

export const getCertificacionInfo = (nombre) => {
  return certificacionesConfig[nombre] || null;
};
