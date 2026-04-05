'use client';

import { useState, useEffect } from 'react';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import HelmetCard from '@/components/HelmetCard';
import { CertificateBadge } from '@/components/CertificateBadges';
import styles from './admin.module.css';

export default function AdminPanel() {
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('inventario'); // 'inventario' o 'ventas'
  
  // Estado para inventario
  const [formData, setFormData] = useState({
    nombre: '',
    marca: '',
    tipo: '',
    color: '',
    precio: '',
    descripcion: '',
    talla: '',
    cantidad: '',
    certificados: [],
    imagen: null,
    imagenes: []
  });
  
  // Estado para ventas
  const [saleData, setSaleData] = useState({
    productoId: '',
    cantidad: '',
    talla: '',
    precioUnitario: ''
  });

  const [salesDateFilter, setSalesDateFilter] = useState('todos'); // 'todos', 'hora', 'dia', 'semana', 'mes'
  
  const [imagePreviews, setImagePreviews] = useState([]);
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [brandFilter, setBrandFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const adminUserData = localStorage.getItem('adminUser');
    if (!adminUserData) {
      router.push('/login');
      return;
    }
    setAdminUser(JSON.parse(adminUserData));
  }, [router]);

  useEffect(() => {
    loadProducts();
    loadSales();
  }, [brandFilter, activeTab]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadSales = async () => {
    try {
      const q = query(collection(db, 'ventas'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setSales(data);
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  const getFilteredSales = () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    return sales.filter(sale => {
      const saleTime = sale.createdAt || 0;
      const timeDiff = now - saleTime;

      switch (salesDateFilter) {
        case 'hora':
          return timeDiff <= oneHour;
        case 'dia':
          return timeDiff <= oneDay;
        case 'semana':
          return timeDiff <= oneWeek;
        case 'mes':
          return timeDiff <= oneMonth;
        default:
          return true;
      }
    });
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      let q;
      if (brandFilter) {
        q = query(collection(db, 'proyectoCascos'), where('marca', '==', brandFilter));
      } else {
        q = query(collection(db, 'proyectoCascos'));
      }
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Actualizar productos que no tengan cantidad (en paralelo, sin bloquear)
      const updatePromises = data.map(product => {
        if (product.cantidad === undefined || product.cantidad === null || product.cantidad === '') {
          product.cantidad = 1;
          return updateDoc(doc(db, 'proyectoCascos', product.id), { cantidad: 1 });
        }
        return Promise.resolve();
      });
      
      // No esperar a que se completen las actualizaciones, mostrar datos inmediatamente
      Promise.all(updatePromises).catch(err => console.error('Error updating quantities:', err));
      
      setProducts(data);
      
      // Calcular valor total
      const total = data.reduce((sum, product) => sum + (parseFloat(product.precio) || 0) * (parseFloat(product.cantidad) || 1), 0);
      setTotalValue(total);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCertificateToggle = (certificate) => {
    setFormData(prev => {
      const currentCerts = prev.certificados || [];
      const index = currentCerts.indexOf(certificate);
      let newCerts;

      if (index > -1) {
        // Remover si ya existe
        newCerts = currentCerts.filter((_, i) => i !== index);
      } else {
        // Agregar si no existe (máximo 3)
        if (currentCerts.length < 3) {
          newCerts = [...currentCerts, certificate];
        } else {
          return prev; // No agregar si ya hay 3
        }
      }

      return {
        ...prev,
        certificados: newCerts
      };
    });
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      imagenes: files
    }));

    const previews = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previews).then(setImagePreviews);
  };

  const uploadImagesToStorage = async (files) => {
    const urls = [];
    for (const file of files) {
      const storageRef = ref(storage, `cascos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    return urls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.marca || !formData.precio) {
      setToast({ type: 'error', message: 'Por favor completa los campos requeridos' });
      return;
    }

    setSubmitting(true);
    try {
      let imageUrls = [];
      
      // Solo subir imágenes si hay nuevas seleccionadas
      if (formData.imagenes && formData.imagenes.length > 0) {
        imageUrls = await uploadImagesToStorage(formData.imagenes);
      }

      const data = {
        nombre: formData.nombre,
        marca: formData.marca,
        tipo: formData.tipo || '',
        color: formData.color || '',
        precio: parseFloat(formData.precio),
        cantidad: parseFloat(formData.cantidad) || 1,
        descripcion: formData.descripcion || '',
        talla: formData.talla || '',
        certificados: formData.certificados || [],
      };

      if (editingId) {
        // Modo de edición
        if (imageUrls.length > 0) {
          data.imagen = imageUrls[0];
          data.imagenes = imageUrls;
          data.imagenPaths = imageUrls;
        }
        await updateDoc(doc(db, 'proyectoCascos', editingId), data);
        
        // Actualizar el producto en el state directamente
        setProducts(prev => prev.map(p => 
          p.id === editingId ? { id: editingId, ...data, ...p } : p
        ));
        
        setToast({ type: 'success', message: '✅ Casco actualizado exitosamente' });
      } else {
        // Modo de creación
        imageUrls = await uploadImagesToStorage(formData.imagenes);
        data.imagen = imageUrls.length > 0 ? imageUrls[0] : '';
        data.imagenes = imageUrls;
        data.imagenPaths = imageUrls;
        data.createdAt = new Date().toISOString();
        const newDoc = await addDoc(collection(db, 'proyectoCascos'), data);
        
        // Agregar el nuevo producto al state directamente
        setProducts(prev => [{ id: newDoc.id, ...data }, ...prev]);
        
        setToast({ type: 'success', message: '✅ Casco agregado exitosamente' });
      }

      setFormData({
        nombre: '',
        marca: '',
        tipo: '',
        color: '',
        precio: '',
        descripcion: '',
        talla: '',
        cantidad: '',
        certificados: [],
        imagen: null,
        imagenes: []
      });
      setImagePreviews([]);
      setEditingId(null);
    } catch (error) {
      console.error('Error adding/updating product:', error);
      setToast({ type: 'error', message: '❌ Error al procesar el casco' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (product) => {
    setFormData({
      nombre: product.nombre,
      marca: product.marca,
      tipo: product.tipo || '',
      color: product.color || '',
      precio: product.precio,
      cantidad: product.cantidad || 1,
      descripcion: product.descripcion || '',
      talla: product.talla || '',
      certificados: product.certificados || [],
      imagen: null,
      imagenes: []
    });
    setImagePreviews([]);
    setEditingId(product.id);
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setFormData({
      nombre: '',
      marca: '',
      tipo: '',
      color: '',
      precio: '',
      descripcion: '',
      talla: '',
      cantidad: '',
      certificados: [],
      imagen: null,
      imagenes: []
    });
    setImagePreviews([]);
    setEditingId(null);
  };

  const handleDragStart = (index) => {
    setDraggedImageIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropImage = (dropIndex) => {
    if (draggedImageIndex === null || draggedImageIndex === dropIndex) {
      setDraggedImageIndex(null);
      return;
    }

    const newPreviews = [...imagePreviews];
    const draggedItem = newPreviews[draggedImageIndex];
    
    // Remover el elemento arrastrado
    newPreviews.splice(draggedImageIndex, 1);
    // Insertar en la nueva posición
    newPreviews.splice(dropIndex, 0, draggedItem);
    
    setImagePreviews(newPreviews);
    setDraggedImageIndex(null);

    // Actualizar formData.imagenes también
    const newFiles = [...formData.imagenes];
    const draggedFile = newFiles[draggedImageIndex];
    newFiles.splice(draggedImageIndex, 1);
    newFiles.splice(dropIndex, 0, draggedFile);
    setFormData({
      ...formData,
      imagenes: newFiles
    });
  };

  const handleDelete = async (productId, imageUrls = []) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este casco?')) return;

    try {
      for (const url of imageUrls) {
        try {
          const fileRef = ref(storage, url);
          await deleteObject(fileRef);
        } catch (err) {
          console.log('Image already deleted or not found');
        }
      }
      
      await deleteDoc(doc(db, 'proyectoCascos', productId));
      loadProducts();
      alert('Casco eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar el casco');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    router.push('/login');
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    
    if (!saleData.productoId || !saleData.cantidad) {
      setToast({ type: 'error', message: 'Por favor completa todos los campos' });
      return;
    }

    setSubmitting(true);
    try {
      const selectedProduct = products.find(p => p.id === saleData.productoId);
      if (!selectedProduct) {
        setToast({ type: 'error', message: 'Producto no encontrado' });
        setSubmitting(false);
        return;
      }

      const cantidad = parseFloat(saleData.cantidad);
      const precioUnitario = parseFloat(saleData.precioUnitario) || selectedProduct.precio;
      const total = cantidad * precioUnitario;

      // Registrar la venta
      const venta = {
        productoId: saleData.productoId,
        productoNombre: selectedProduct.nombre,
        marca: selectedProduct.marca,
        cantidad: cantidad,
        talla: saleData.talla || selectedProduct.talla,
        precioUnitario: precioUnitario,
        total: total,
        createdAt: Date.now(),
        fecha: new Date().toLocaleString('es-PE')
      };

      const newSaleDoc = await addDoc(collection(db, 'ventas'), venta);
      
      // Agregar la venta al state directamente
      setSales(prev => [{ id: newSaleDoc.id, ...venta }, ...prev]);

      // Actualizar stock del producto
      const newCantidad = (parseFloat(selectedProduct.cantidad) || 1) - cantidad;
      await updateDoc(doc(db, 'proyectoCascos', saleData.productoId), {
        cantidad: newCantidad
      });
      
      // Actualizar el producto en el state
      setProducts(prev => prev.map(p => 
        p.id === saleData.productoId ? { ...p, cantidad: newCantidad } : p
      ));

      // Limpiar formulario
      setSaleData({
        productoId: '',
        cantidad: '',
        talla: '',
        precioUnitario: ''
      });

      setToast({ type: 'success', message: '✅ Venta registrada exitosamente' });
    } catch (error) {
      console.error('Error registering sale:', error);
      setToast({ type: 'error', message: '❌ Error al registrar la venta' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSale = async (saleId, productId, cantidad) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta venta? El stock se revertirá.')) return;

    try {
      // Eliminar la venta
      await deleteDoc(doc(db, 'ventas', saleId));

      // Restaurar stock del producto
      const product = products.find(p => p.id === productId);
      if (product) {
        const newCantidad = (parseFloat(product.cantidad) || 0) + parseFloat(cantidad);
        await updateDoc(doc(db, 'proyectoCascos', productId), {
          cantidad: newCantidad
        });
      }

      // Recargar datos
      loadProducts();
      loadSales();
      alert('Venta eliminada y stock restaurado');
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Error al eliminar la venta');
    }
  };

  const uniqueBrands = [...new Set(products.map(p => p.marca).filter(Boolean))];
  const inStockCount = products.reduce((sum, p) => sum + (parseFloat(p.cantidad) || 1), 0);
  const lowStockCount = products.filter(p => (parseFloat(p.cantidad) || 1) < 5).length;

  if (!adminUser) {
    return <div>Cargando...</div>;
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminHeader}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>InRacing</h1>
          <p className={styles.headerSubtitle}>Gestión de Inventario Premium</p>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Cerrar Sesión
        </button>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'inventario' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('inventario')}
        >
          📦 Inventario
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'ventas' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('ventas')}
        >
          💳 Ventas
        </button>
        <button 
          className={styles.tabButton}
          onClick={() => router.push('/')}
        >
          🏠 Catálogo
        </button>
      </div>

      {/* VISTA DE INVENTARIO */}
      {activeTab === 'inventario' && (
      <div className={styles.content}>
        <div className={styles.formSection}>
          <div className={styles.formCard}>
            <h3 className={styles.formTitle}>{editingId ? '✏️ Editar Casco' : '➕ Nuevo Casco'}</h3>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Nombre del casco"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={styles.input}
                />
                <input
                  type="text"
                  name="marca"
                  placeholder="Marca (ej. Shark, LS2, AGV)"
                  value={formData.marca}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGrid}>
                <input
                  type="text"
                  name="tipo"
                  placeholder="Tipo (ej. Full Face, Half)"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  className={styles.input}
                />
                <input
                  type="text"
                  name="color"
                  placeholder="Color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGrid}>
                <input
                  type="number"
                  name="precio"
                  placeholder="Precio (S/)"
                  value={formData.precio}
                  onChange={handleInputChange}
                  className={styles.input}
                />
                <input
                  type="number"
                  name="cantidad"
                  placeholder="Cantidad disponible"
                  value={formData.cantidad}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGrid}>
                <select
                  name="talla"
                  value={formData.talla}
                  onChange={handleInputChange}
                  className={styles.input}
                >
                  <option value="">Seleccionar talla</option>
                  <option value="S">S - Pequeño</option>
                  <option value="M">M - Mediano</option>
                  <option value="L">L - Grande</option>
                  <option value="XL">XL - Muy Grande</option>
                </select>
              </div>

              <div className={styles.formGrid}>
                <div style={{gridColumn: '1 / -1'}}>
                  <label className={styles.filterLabel}>Certificados (máximo 3)</label>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px'}}>
                    {['DOT', 'ECE'].map(cert => (
                      <div
                        key={cert}
                        onClick={() => handleCertificateToggle(cert)}
                        style={{
                          padding: '16px',
                          border: formData.certificados?.includes(cert) ? '2px solid #ff9159' : '2px solid rgba(255, 145, 89, 0.2)',
                          borderRadius: '8px',
                          backgroundColor: formData.certificados?.includes(cert) ? 'rgba(255, 145, 89, 0.1)' : 'var(--bg-tertiary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.3s ease',
                          userSelect: 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.certificados?.includes(cert) || false}
                          onChange={() => handleCertificateToggle(cert)}
                          style={{cursor: 'pointer', width: '20px', height: '20px'}}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <div style={{fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem'}}>
                            {cert === 'DOT' ? '🇺🇸 DOT' : '🇪🇺 ECE R22-05'}
                          </div>
                          <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px'}}>
                            {cert === 'DOT' ? 'USA Standard' : 'European Safety'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                    Seleccionados: {formData.certificados?.length || 0} / 3
                  </div>
                </div>
              </div>

              <textarea
                name="descripcion"
                placeholder="Descripción del casco"
                value={formData.descripcion}
                onChange={handleInputChange}
                className={styles.textarea}
                rows="3"
              />

              <div className={styles.imageUpload}>
                <label className={styles.uploadLabel}>IMÁGENES</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className={styles.fileInput}
                />
                {imagePreviews.length > 0 && (
                  <p className={styles.imageCount}>{imagePreviews.length} imagen(es) seleccionada(s)</p>
                )}
                
                {imagePreviews.length > 0 && (
                  <div className={styles.previewGrid}>
                    {imagePreviews.map((preview, idx) => (
                      <div 
                        key={idx} 
                        className={`${styles.previewItem} ${draggedImageIndex === idx ? styles.dragging : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDropImage(idx)}
                      >
                        <img src={preview} alt={`Preview ${idx + 1}`} />
                        <div className={styles.previewNumber}>{idx + 1}</div>
                        <div className={styles.dragHint}>🔄 Arrastra para reordenar</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? '⏳ Procesando...' : (editingId ? '✏️ Actualizar' : '➕ Crear')}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className={styles.cancelBtn}
                >
                  {editingId ? 'Cancelar Edición' : 'Cancelar'}
                </button>
              </div>

              <div className={styles.stockSummary}>
                <div className={styles.summaryTitle}>Total Stock Value</div>
                <div className={styles.summaryValue}>S/ {totalValue.toFixed(2)}</div>
                <div className={styles.summaryStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Unidades Totales</span>
                    <span className={styles.statValue}>{inStockCount}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Bajo Stock</span>
                    <span className={styles.statValue}>{lowStockCount}</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.listSection}>
          <div className={styles.listHeader}>
            <h2 className={styles.listTitle}>Inventario ({products.length})</h2>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className={styles.brandFilter}
            >
              <option value="">Todas las marcas</option>
              {uniqueBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p>Cargando...</p>
          ) : products.length === 0 ? (
            <p>No hay cascos disponibles</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>IMAGEN</th>
                  <th>NOMBRE</th>
                  <th>MARCA</th>
                  <th>PRECIO</th>
                  <th>STOCK</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>
                      {product.imagen && (
                        <img src={product.imagen} alt={product.nombre} className={styles.tableImg} />
                      )}
                    </td>
                    <td className={styles.nameCell}>
                      <div>{product.nombre}</div>
                      <div className={styles.productMeta}>{product.tipo} • {product.talla || 'N/A'}</div>
                    </td>
                    <td>{product.marca}</td>
                    <td className={styles.priceCell}>S/ {product.precio}</td>
                    <td>
                      <span className={`${styles.stockBadge} ${parseFloat(product.cantidad) < 5 ? styles.stockBadgeLow : ''}`}>
                        {parseFloat(product.cantidad) >= 5 ? 'En Stock' : 'Bajo Stock'} ({product.cantidad || 1})
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      <button 
                        type="button"
                        className={styles.editBtn} 
                        title="Editar"
                        onClick={() => handleEdit(product)}
                      >
                        ✏️
                      </button>
                      <button 
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(product.id, product.imagenes || [])}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}

      {/* VISTA DE VENTAS */}
      {activeTab === 'ventas' && (
      <div className={styles.ventasContent}>
        <div className={styles.salesSection}>
          {/* FORMULARIO DE VENTA RÁPIDA */}
          <div className={styles.formCard}>
            <h3 className={styles.formTitle}>⚡ Registro Rápido de Venta</h3>
            <form onSubmit={handleSaleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <select
                  value={saleData.productoId}
                  onChange={(e) => {
                    const selectedProduct = products.find(p => p.id === e.target.value);
                    setSaleData({
                      ...saleData,
                      productoId: e.target.value,
                      precioUnitario: selectedProduct?.precio || ''
                    });
                  }}
                  className={styles.input}
                >
                  <option value="">Seleccionar Producto</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.nombre} - {product.marca} (Stock: {product.cantidad || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGrid}>
                <input
                  type="number"
                  min="1"
                  placeholder="Cantidad"
                  value={saleData.cantidad}
                  onChange={(e) => setSaleData({...saleData, cantidad: e.target.value})}
                  className={styles.input}
                />
                <select
                  value={saleData.talla}
                  onChange={(e) => setSaleData({...saleData, talla: e.target.value})}
                  className={styles.input}
                >
                  <option value="">Talla (opcional)</option>
                  <option value="S">S - Pequeño</option>
                  <option value="M">M - Mediano</option>
                  <option value="L">L - Grande</option>
                  <option value="XL">XL - Muy Grande</option>
                </select>
              </div>

              <div className={styles.formGrid}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Precio Unitario (S/)"
                  value={saleData.precioUnitario}
                  onChange={(e) => setSaleData({...saleData, precioUnitario: e.target.value})}
                  className={styles.input}
                />
                <div className={styles.totalDisplay}>
                  <span className={styles.totalLabel}>Total:</span>
                  <span className={styles.totalValue}>
                    S/ {(parseFloat(saleData.cantidad || 0) * parseFloat(saleData.precioUnitario || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? '⏳ Procesando...' : '💳 Registrar Venta'}
                </button>
              </div>
            </form>
          </div>

          {/* RESUMEN DE VENTAS */}
          <div className={styles.salesSummary}>
            <h3 className={styles.summaryTitle}>Resumen de Ventas</h3>
            <div className={styles.summaryStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Total de Ventas</span>
                <span className={styles.statValue}>{sales.length}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Ingresos Totales</span>
                <span className={styles.statValue}>
                  S/ {sales.reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Hoy</span>
                <span className={styles.statValue}>
                  {sales.filter(s => {
                    const today = new Date().toDateString();
                    const saleDate = new Date(s.createdAt).toDateString();
                    return today === saleDate;
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.ventasRightColumn}>
        {/* ANALYTICS SECTION */}
        <div className={styles.analyticsSection}>
          <h2 className={styles.listTitle}>📊 Analytics - Análisis de Ventas</h2>
          
          {/* METRICS */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total Ingresos</span>
              <span className={styles.metricValue}>
                S/ {sales.reduce((sum, s) => sum + (s.total || 0), 0).toFixed(2)}
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total Ventas</span>
              <span className={styles.metricValue}>{sales.length}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Promedio por Venta</span>
              <span className={styles.metricValue}>
                S/ {sales.length > 0 ? (sales.reduce((sum, s) => sum + (s.total || 0), 0) / sales.length).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Unidades Vendidas</span>
              <span className={styles.metricValue}>
                {sales.reduce((sum, s) => sum + (s.cantidad || 0), 0)}
              </span>
            </div>
          </div>

          {/* MONTHLY CHART */}
          <div className={styles.chartContainer}>
            <h3 className={styles.chartTitle}>Ventas por Mes</h3>
            <div className={styles.monthlyChart}>
              {(() => {
                // Agrupar ventas por mes
                const monthlyData = {};
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                
                sales.forEach(sale => {
                  const date = new Date(sale.createdAt);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { count: 0, total: 0 };
                  }
                  monthlyData[monthKey].count += 1;
                  monthlyData[monthKey].total += sale.total || 0;
                });

                // Obtener últimos 6 meses
                const last6Months = [];
                for (let i = 5; i >= 0; i--) {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  last6Months.push({
                    key: monthKey,
                    label: monthNames[date.getMonth()],
                    count: monthlyData[monthKey]?.count || 0,
                    total: monthlyData[monthKey]?.total || 0
                  });
                }

                // Encontrar máximo para escalar
                const maxValue = Math.max(...last6Months.map(m => m.total), 1);

                return (
                  <div className={styles.barsContainer}>
                    {last6Months.map(month => (
                      <div key={month.key} className={styles.barItem}>
                        <div className={styles.barWrapper}>
                          <div 
                            className={styles.bar}
                            style={{height: `${(month.total / maxValue) * 150}px`}}
                            title={`S/ ${month.total.toFixed(2)}`}
                          >
                            <span className={styles.barValue}>S/ {month.total.toFixed(0)}</span>
                          </div>
                        </div>
                        <span className={styles.barLabel}>{month.label}</span>
                        <span className={styles.barCount}>{month.count} venta{month.count !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* HISTORIAL DE VENTAS */}
        <div className={styles.analyticsSection}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2 className={styles.listTitle}>📋 Historial de Ventas</h2>
            <select
              value={salesDateFilter}
              onChange={(e) => setSalesDateFilter(e.target.value)}
              className={styles.brandFilter}
              style={{width: '200px'}}
            >
              <option value="todos">Todas las ventas</option>
              <option value="hora">Última hora</option>
              <option value="dia">Último día</option>
              <option value="semana">Última semana</option>
              <option value="mes">Último mes</option>
            </select>
          </div>
          {sales.length === 0 ? (
            <p style={{padding: '20px', textAlign: 'center'}}>No hay ventas registradas</p>
          ) : getFilteredSales().length === 0 ? (
            <p style={{padding: '20px', textAlign: 'center'}}>No hay ventas en este período</p>
          ) : (
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>FECHA</th>
                    <th>PRODUCTO</th>
                    <th>MARCA</th>
                    <th>CANTIDAD</th>
                    <th>TALLA</th>
                    <th>PRECIO UNIT.</th>
                    <th>TOTAL</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredSales().map(sale => (
                    <tr key={sale.id}>
                      <td data-label="FECHA">{sale.fecha}</td>
                      <td data-label="PRODUCTO">{sale.productoNombre}</td>
                      <td data-label="MARCA">{sale.marca}</td>
                      <td data-label="CANTIDAD" className={styles.centerCell}>{sale.cantidad}</td>
                      <td data-label="TALLA" className={styles.centerCell}>{sale.talla || '-'}</td>
                      <td data-label="PRECIO UNIT." className={styles.priceCell}>S/ {sale.precioUnitario.toFixed(2)}</td>
                      <td data-label="TOTAL" className={styles.priceCell} style={{fontWeight: 'bold', color: '#ff9159'}}>
                        S/ {sale.total.toFixed(2)}
                      </td>
                      <td data-label="ACCIONES" className={styles.actionsCell}>
                        <button
                          onClick={() => handleDeleteSale(sale.id, sale.productoId, sale.cantidad)}
                          className={styles.deleteBtn}
                          title="Eliminar venta"
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

