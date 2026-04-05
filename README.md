# MotoStore Pro - Guía de Uso

## ✨ Características Premium

✅ **Sistema de Autenticación Admin** - Login seguro con Firebase  
✅ **Panel de Admin** - Subir imágenes manualmente como archivos  
✅ **Almacenamiento en Firebase Storage** - Las imágenes se guardan en la nube  
✅ **Catálogo Público** - Usuarios sin login ven todos los productos  
✅ **Diseño Profesional** - Interfaz moderna y responsive  
✅ **Integración WhatsApp** - Botones de consulta directa  

---

## 🚀 Configuración Inicial

### 1. **Crear Usuario Admin en Firebase**

1. Entra a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `motos-34a81`
3. Ve a **Authentication** → **Users**
4. Haz clic en **Add user**
5. Ingresa:
   - **Email:** `admin@motostore.com` (puedes cambiar)
   - **Password:** Contraseña segura de mínimo 6 caracteres
6. Da clic en **Create user**

### 2. **Habilitar Firebase Storage**

1. En Firebase Console, ve a **Storage**
2. Si no está habilitado, haz clic en **Get started**
3. Acepta las reglas de seguridad por defecto

### 3. **Configurar Reglas de Storage** (Seguridad)

Ve a **Storage** → **Rules** y reemplaza con esto:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /cascos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

---

## 📱 Cómo Usar

### **Para Usuarios (Catálogo)**

1. Abre `http://localhost:3000`
2. Verás todos los productos disponibles
3. Haz clic en **"Consultar por WhatsApp"** para hablar con ventas
4. Si eres admin, verás botón **"Admin Panel"** al loguear

### **Para Admin**

#### Acceso:
1. Ve a `http://localhost:3000/login`
2. Ingresa el email y contraseña que creaste en Firebase
3. Versión en el **Panel de Admin**

#### Crear Producto:
1. Completa los campos:
   - **Nombre del Casco** → Ej: "Casco LS2 FFX"
   - **Precio** → Ej: "350.00"
   - **Imagen** → Selecciona archivo desde tu computadora
2. Verás preview de la imagen
3. Haz clic en **"Guardar"**
4. El producto aparecerá automáticamente en el catálogo

#### Editar Producto:
1. En la lista de productos, haz clic en **"Editar"**
2. El formulario se llenarán queda el producto
3. Puedes cambiar cualquier dato e imagen
4. Haz clic en **"Guardar"**

#### Eliminar Producto:
1. Haz clic en **"Eliminar"** junto al producto
2. Confirma la acción
3. Se eliminará la imagen de Storage y el producto de la base de datos

#### Cerrar Sesión:
1. Haz clic en **"Cerrar Sesión"** (arriba a la derecha)

---

## 📂 Estructura del Proyecto

```
moto-store-pro/
├── app/
│   ├── page.js           → Catálogo público
│   ├── login/
│   │   └── page.js       → Página de login
│   ├── admin/
│   │   └── page.js       → Panel de administración
│   └── layout.js         → Layout principal
├── lib/
│   └── firebase.js       → Configuración Firebase
├── package.json          → Dependencias
└── README.md            → Este archivo
```

---

## 🔧 Comandos Útiles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Iniciar servidor de producción
npm start
```

---

## 🎨 Personalización

### Cambiar Número WhatsApp

En [app/page.js](app/page.js), busca:
```javascript
href={`https://wa.me/51999999999?text=...`}
```

Reemplaza `51999999999` con tu número (código país + número sin símbolos)

### Cambiar Colores

- **Color Primario (Naranja):** Busca `#ff6b00` y cambia hexa
- **Color Secundario (Oscuro):** Busca `#0f0f0f` y cambia hexa

### Cambiar Nombre de la Tienda

Busca `MotoStore Pro` en los archivos y reemplaza

---

## ⚠️ Problemas Comunes

### "Error: Firebase Storage not initialized"
✓ Verificar que Storage esté habilitado en Firebase Console

### "No se puede subir imagen"
✓ Revisar las reglas de Storage (estar logueado)
✓ Verificar que el archivo es imagen (JPG, PNG, WebP)
✓ Revisar tamaño máximo (recomendado < 5MB)

### "No aparecen los productos"
✓ Verificar que la colección `proyectoCascos` existe en Firestore
✓ Llenar al menos 1 producto en el admin

### "El sitio muestra fondo negro"
✓ Limpiar caché del navegador (Ctrl+Shift+Delete)
✓ Reiniciar servidor (`npm run dev`)

---

## 📞 Soporte

Si necesitas ayuda:
1. Revisa la consola del navegador (F12)
2. Verifica logs en Firebase Console
3. Asegúrate que Firebase está correctamente configurado

---

**¡Tu tienda MotoStore Pro está lista!** 🏍️🚀
