'use client';

import { useState, useEffect } from 'react';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import HelmetCard from '@/components/HelmetCard';
import { CertificateBadge } from '@/components/CertificateBadges';
import styles from './admin.module.css';
import * as XLSX from 'xlsx';

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
    precioCompra: '',
    descripcion: '',
    talla: [], // Ahora es array para múltiples tallas
    cantidad: '',
    certificados: [],
    piloto: '', // Christian o Saturno
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState(new Set()); // Para selección múltiple
  const [marcasSugeridas, setMarcasSugeridas] = useState([]); // Para autocompletado
  const [duplicadoEncontrado, setDuplicadoEncontrado] = useState(null); // Para búsqueda en tiempo real
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
    loadSales();
    
    // Configurar listeners para actualizaciones en tiempo real
    const unsubscribeProducts = onSnapshot(collection(db, 'proyectoCascos'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProducts(data);
      setLoading(false);
      const total = data.reduce((sum, product) => sum + (parseFloat(product.precio) || 0) * (parseFloat(product.cantidad) || 1), 0);
      setTotalValue(total);
    }, (error) => {
      console.error('Error en listener de produtos:', error);
      setLoading(false);
    });

    const unsubscribeSales = onSnapshot(collection(db, 'ventas'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setSales(data);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeSales();
    };
  }, []);

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

  const handleExportToExcel = () => {
    try {
      const filteredSales = getFilteredSales();
      if (filteredSales.length === 0) {
        setToast({ type: 'error', message: 'No hay ventas para exportar' });
        return;
      }

      // Preparar datos para Excel
      const excelData = filteredSales.map(sale => {
        const product = products.find(p => p.id === sale.productoId) || {};
        const saleDate = new Date(sale.createdAt).toLocaleString('es-PE');
        const precioCompra = product.precioCompra || 0;
        const precioVenta = sale.precioUnitario || 0;
        const ganancia = (precioVenta - precioCompra) * (sale.cantidad || 1);
        
        return {
          'Fecha': saleDate,
          'Producto': product.nombre || 'N/A',
          'Marca': product.marca || 'N/A',
          'Piloto': product.piloto || '-',
          'Cantidad': sale.cantidad || 0,
          'Talla': sale.talla || '-',
          'Precio Compra': precioCompra,
          'Precio Venta': precioVenta,
          'Ganancia Unitaria': precioVenta - precioCompra,
          'Total Venta': sale.total || 0,
          'Total Ganancia': ganancia.toFixed(2)
        };
      });

      // Crear worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Ajustar ancho de columnas
      const columnWidths = [
        { wch: 20 },  // Fecha
        { wch: 30 },  // Producto
        { wch: 15 },  // Marca
        { wch: 15 },  // Piloto
        { wch: 10 },  // Cantidad
        { wch: 10 },  // Talla
        { wch: 12 },  // Precio Compra
        { wch: 12 },  // Precio Venta
        { wch: 18 },  // Ganancia Unitaria
        { wch: 12 },  // Total Venta
        { wch: 15 }   // Total Ganancia
      ];
      ws['!cols'] = columnWidths;

      // Crear workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

      // Crear nombre de archivo con fecha y filtro
      const dateStr = new Date().toISOString().split('T')[0];
      const filterStr = salesDateFilter === 'todos' ? 'todas' : salesDateFilter;
      const filename = `inracing_ventas_${filterStr}_${dateStr}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, filename);
      setToast({ type: 'success', message: `✅ Exportado ${filteredSales.length} ventas a Excel` });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setToast({ type: 'error', message: '❌ Error al exportar a Excel' });
    }
  };

  // Filtrar productos localmente por marca (sin re-query a Firestore)
  const getFilteredProducts = () => {
    if (brandFilter) {
      return products.filter(p => p.marca === brandFilter);
    }
    return products;
  };

  const filteredProducts = getFilteredProducts();
  const uniqueBrands = [...new Set(products.map(p => p.marca).filter(Boolean))];
  const inStockCount = filteredProducts.reduce((sum, p) => sum + (parseFloat(p.cantidad) || 1), 0);
  const lowStockCount = filteredProducts.filter(p => (parseFloat(p.cantidad) || 1) < 5).length;
  const totalValueFiltered = filteredProducts.reduce((sum, product) => sum + (parseFloat(product.precio) || 0) * (parseFloat(product.cantidad) || 1), 0);

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

    // Change 2: Sugerencias de marca
    if (name === 'marca') {
      const uniqueMarcas = [...new Set(products.map(p => p.marca).filter(Boolean))];
      const sugeridas = uniqueMarcas.filter(m => 
        m.toLowerCase().includes(value.toLowerCase())
      );
      setMarcasSugeridas(sugeridas);
    }

    // Change 5: Búsqueda de duplicados en tiempo real
    if (name === 'nombre' || name === 'marca' || name === 'color') {
      const currentNombre = name === 'nombre' ? value : formData.nombre;
      const currentMarca = name === 'marca' ? value : formData.marca;
      const currentColor = name === 'color' ? value : formData.color;

      if (currentNombre && currentMarca && currentColor) {
        const duplicado = products.find(p => 
          p.nombre === currentNombre && 
          p.marca === currentMarca && 
          p.color === currentColor &&
          p.id !== editingId // No contar si estamos editando el mismo
        );
        setDuplicadoEncontrado(duplicado || null);
      } else {
        setDuplicadoEncontrado(null);
      }
    }
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

  // Change 3: Calcular ganancia
  const calcularGanancia = () => {
    const precio = parseFloat(formData.precio) || 0;
    const precioCompra = parseFloat(formData.precioCompra) || 0;
    const ganancia = precio - precioCompra;
    const margen = precioCompra > 0 ? ((ganancia / precioCompra) * 100).toFixed(2) : 0;
    return { ganancia, margen };
  };

  const handleTallaToggle = (talla) => {
    setFormData(prev => {
      const currentTallas = prev.talla || [];
      const index = currentTallas.indexOf(talla);
      let newTallas;

      if (index > -1) {
        // Remover si ya existe
        newTallas = currentTallas.filter((_, i) => i !== index);
      } else {
        // Agregar si no existe
        newTallas = [...currentTallas, talla];
      }

      return {
        ...prev,
        talla: newTallas
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
    if (!files || files.length === 0) return [];
    
    setUploadProgress(0);
    const uploadPromises = files.map(async (file, index) => {
      const storageRef = ref(storage, `cascos/${Date.now()}_${Math.random()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setUploadProgress(prev => Math.min(prev + (100 / files.length), 95));
      
      return url;
    });
    
    const urls = await Promise.all(uploadPromises);
    setUploadProgress(100);
    setTimeout(() => setUploadProgress(0), 1500);
    return urls;
  };

  const verificarDuplicado = async (nombre, marca, color, pilotos = []) => {
    /*
    Verifica si existe un casco con el mismo nombre, marca y color.
    Si existe con un piloto diferente, permite agregarlo pero lo marca como inventario_solo.
    Retorna: { existeDuplicado: bool, mensaje: string, soloInventario: bool }
    */
    try {
      const q = query(
        collection(db, 'proyectoCascos'),
        where('nombre', '==', nombre),
        where('marca', '==', marca),
        where('color', '==', color)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // No existe duplicado
        return { existeDuplicado: false, mensaje: '', soloInventario: false };
      }

      // Existe al menos uno
      const existentes = querySnapshot.docs.map(doc => doc.data());
      
      // Verificar si el piloto es diferente
      const pilotoActual = pilotos[0] || ''; // Obtener primer piloto del array
      const existePilotoIgual = existentes.some(e => e.piloto === pilotoActual);

      if (existePilotoIgual) {
        // Existe con el mismo piloto = error
        return { 
          existeDuplicado: true, 
          mensaje: 'Casco ya existe, debes actualizar',
          soloInventario: false 
        };
      } else {
        // Existe pero con diferente piloto = permitir pero solo inventario
        return { 
          existeDuplicado: false, 
          mensaje: '', 
          soloInventario: true 
        };
      }
    } catch (error) {
      console.error('Error verifying duplicate:', error);
      return { existeDuplicado: false, mensaje: '', soloInventario: false };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.marca || !formData.precio) {
      setToast({ type: 'error', message: 'Por favor completa los campos requeridos' });
      return;
    }

    setSubmitting(true);
    try {
      // En modo de creación, verificar duplicados
      if (!editingId) {
        const { existeDuplicado, mensaje, soloInventario } = await verificarDuplicado(
          formData.nombre,
          formData.marca,
          formData.color,
          formData.piloto ? [formData.piloto] : []
        );

        if (existeDuplicado) {
          setToast({ type: 'error', message: `❌ ${mensaje}` });
          setSubmitting(false);
          return;
        }

        // Si es solo inventario (diferente piloto), agregar flag
        if (soloInventario) {
          // Esto será manejado en la estructura de datos
        }
      }

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
        precioCompra: parseFloat(formData.precioCompra) || 0,
        cantidad: parseFloat(formData.cantidad) || 1,
        descripcion: formData.descripcion || '',
        talla: Array.isArray(formData.talla) ? formData.talla : [], // Guardar como array
        piloto: formData.piloto || '', // Christian o Saturno
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
        data.imagen = imageUrls.length > 0 ? imageUrls[0] : '';
        data.imagenes = imageUrls;
        data.imagenPaths = imageUrls;
        data.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'proyectoCascos'), data);
        
        // El listener onSnapshot se encargará de actualizar el estado automáticamente
        setToast({ type: 'success', message: '✅ Casco agregado exitosamente' });
      }

      setFormData({
        nombre: '',
        marca: '',
        tipo: '',
        color: '',
        precio: '',
        precioCompra: '',
        descripcion: '',
        talla: [], // Array vacío para tallas
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
      precioCompra: product.precioCompra || '',
      cantidad: product.cantidad || 1,
      descripcion: product.descripcion || '',
      talla: Array.isArray(product.talla) ? product.talla : (product.talla ? [product.talla] : []),
      piloto: product.piloto || '', // Cargar piloto
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
      precioCompra: '',
      descripcion: '',
      talla: [], // Array vacío
      piloto: '', // Resetear piloto
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
      // Eliminar imágenes de storage
      for (const url of imageUrls) {
        try {
          const fileRef = ref(storage, url);
          await deleteObject(fileRef);
        } catch (err) {
          console.log('Image already deleted or not found');
        }
      }
      
      // Eliminar documento - el listener automáticamente sincronizará
      await deleteDoc(doc(db, 'proyectoCascos', productId));
      
      // Limpiar selección si estaba seleccionado
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      
      setToast({ type: 'success', message: '✅ Casco eliminado exitosamente' });
    } catch (error) {
      console.error('Error deleting product:', error);
      setToast({ type: 'error', message: '❌ Error al eliminar el casco' });
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedProducts.size} casco(s)?`)) return;

    setSubmitting(true);
    try {
      const productsToDelete = products.filter(p => selectedProducts.has(p.id));
      
      // Eliminar cada producto
      for (const product of productsToDelete) {
        // Eliminar imágenes de storage
        if (product.imagenes && product.imagenes.length > 0) {
          for (const url of product.imagenes) {
            try {
              const fileRef = ref(storage, url);
              await deleteObject(fileRef);
            } catch (err) {
              console.log('Image already deleted or not found');
            }
          }
        }
        
        // Eliminar documento - el listener automáticamente sincronizará
        await deleteDoc(doc(db, 'proyectoCascos', product.id));
      }
      
      // Limpiar selección
      setSelectedProducts(new Set());
      setToast({ type: 'success', message: `✅ ${productsToDelete.length} casco(s) eliminado(s)` });
    } catch (error) {
      console.error('Error deleting products:', error);
      setToast({ type: 'error', message: '❌ Error al eliminar los cascos' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportInventoryToExcel = () => {
    try {
      if (filteredProducts.length === 0) {
        setToast({ type: 'error', message: 'No hay productos para exportar' });
        return;
      }

      // Preparar datos para Excel
      const excelData = filteredProducts.map(product => ({
        'Nombre': product.nombre || 'N/A',
        'Marca': product.marca || 'N/A',
        'Tipo': product.tipo || '-',
        'Color': product.color || '-',
        'Talla': Array.isArray(product.talla) ? product.talla.join(', ') || '-' : product.talla || '-',
        'Piloto': product.piloto || '-',
        'Certificados': (product.certificados || []).join(', ') || '-',
        'Cantidad': product.cantidad || 0,
        'Precio Unitario': product.precio || 0,
        'Precio Compra': product.precioCompra || 0,
        'Stock Total (S/)': (product.precio || 0) * (product.cantidad || 0),
        'Descripción': product.descripcion || '-'
      }));

      // Crear worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Ajustar ancho de columnas
      const columnWidths = [
        { wch: 25 },  // Nombre
        { wch: 15 },  // Marca
        { wch: 15 },  // Tipo
        { wch: 12 },  // Color
        { wch: 10 },  // Talla
        { wch: 12 },  // Piloto
        { wch: 20 },  // Certificados
        { wch: 12 },  // Cantidad
        { wch: 15 },  // Precio Unitario
        { wch: 12 },  // Precio Compra
        { wch: 15 },  // Stock Total
        { wch: 30 }   // Descripción
      ];
      ws['!cols'] = columnWidths;

      // Crear workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

      // Crear nombre de archivo con fecha
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `inracing_inventario_${dateStr}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, filename);
      setToast({ type: 'success', message: `✅ Exportados ${filteredProducts.length} productos a Excel` });
    } catch (error) {
      console.error('Error exporting inventory to Excel:', error);
      setToast({ type: 'error', message: '❌ Error al exportar inventario a Excel' });
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

              {/* Change 2: Mostrar sugerencias de marca */}
              {marcasSugeridas.length > 0 && formData.marca && (
                <div style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid rgba(255, 145, 89, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  {marcasSugeridas.map(marca => (
                    <div
                      key={marca}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, marca }));
                        setMarcasSugeridas([]);
                      }}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255, 145, 89, 0.1)',
                        fontSize: '0.9rem'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 145, 89, 0.1)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      {marca}
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.formGrid}>
                {/* Change 4: Tipo como select con ABATIBLE e INTEGRAL */}
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  className={styles.input}
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="ABATIBLE">ABATIBLE</option>
                  <option value="INTEGRAL">INTEGRAL</option>
                </select>
                <input
                  type="text"
                  name="color"
                  placeholder="Color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              {/* Change 5: Mostrar si existe duplicado */}
              {duplicadoEncontrado && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255, 107, 107, 0.1)',
                  border: '2px solid #ff6b6b',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '0.9rem',
                  color: '#ff6b6b',
                  fontWeight: '500'
                }}>
                  ⚠️ <strong>Casco duplicado encontrado:</strong> {duplicadoEncontrado.nombre} ({duplicadoEncontrado.piloto || 'Sin piloto'})
                  <div style={{fontSize: '0.85rem', marginTop: '4px', opacity: 0.8}}>
                    Deberías actualizar en lugar de crear uno nuevo
                  </div>
                </div>
              )}

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
                <input
                  type="number"
                  step="0.01"
                  name="precioCompra"
                  placeholder="Precio de Compra (S/)"
                  value={formData.precioCompra}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              {/* Change 3: Mostrar ganancia e instantáneamente */}
              {formData.precio && formData.precioCompra && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  border: '2px solid #4caf50',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                    <div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Ganancia Unitaria</div>
                      <div style={{fontSize: '1.4rem', fontWeight: '700', color: '#4caf50', marginTop: '4px'}}>
                        S/ {calcularGanancia().ganancia.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Margen de Ganancia</div>
                      <div style={{fontSize: '1.4rem', fontWeight: '700', color: '#4caf50', marginTop: '4px'}}>
                        {calcularGanancia().margen}%
                      </div>
                    </div>
                  </div>
                  {calcularGanancia().ganancia <= 0 && (
                    <div style={{color: '#ff6b6b', fontSize: '0.9rem', marginTop: '8px'}}>
                      ⚠️ El precio de venta debe ser mayor que el de compra
                    </div>
                  )}
                </div>
              )}

              <div className={styles.formGrid}>
                <div style={{gridColumn: '1 / -1'}}>
                  <label className={styles.filterLabel}>Tallas Disponibles</label>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px'}}>
                    {['S', 'M', 'L', 'XL', 'XXL'].map(talla => (
                      <div
                        key={talla}
                        onClick={() => handleTallaToggle(talla)}
                        style={{
                          padding: '14px',
                          border: formData.talla?.includes(talla) ? '2px solid #ff9159' : '2px solid rgba(255, 145, 89, 0.2)',
                          borderRadius: '8px',
                          backgroundColor: formData.talla?.includes(talla) ? 'rgba(255, 145, 89, 0.1)' : 'var(--bg-tertiary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.3s ease',
                          userSelect: 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.talla?.includes(talla) || false}
                          onChange={() => handleTallaToggle(talla)}
                          style={{cursor: 'pointer', width: '20px', height: '20px', flexShrink: 0}}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div style={{fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem'}}>
                          {talla === 'S' ? 'S (Pequeño)' : talla === 'M' ? 'M (Mediano)' : talla === 'L' ? 'L (Grande)' : talla === 'XL' ? 'XL (Muy Grande)' : 'XXL (Extra Grande)'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                    Seleccionadas: {formData.talla?.length || 0} tallas
                  </div>
                </div>
              </div>

              <div className={styles.formGrid}>
                <select
                  name="piloto"
                  value={formData.piloto}
                  onChange={handleInputChange}
                  className={styles.input}
                >
                  <option value="">Seleccionar Piloto</option>
                  <option value="Christian">Christian</option>
                  <option value="Saturno">Saturno</option>
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

              {uploadProgress > 0 && (
                <div className={styles.progressContainer}>
                  <div className={styles.progressLabel}>
                    Subiendo imágenes... {uploadProgress}%
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

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
                <div className={styles.summaryValue}>S/ {totalValueFiltered.toFixed(2)}</div>
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
            <h2 className={styles.listTitle}>Inventario ({filteredProducts.length})</h2>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
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
              <button 
                onClick={handleExportInventoryToExcel}
                className={styles.exportBtn}
                title="Exportar inventario a Excel"
              >
                📊 Exportar Inventario
              </button>
              {selectedProducts.size > 0 && (
                <button 
                  onClick={handleDeleteMultiple}
                  className={styles.deleteBtn}
                  style={{padding: '8px 16px', fontSize: '0.9rem'}}
                  title="Eliminar seleccionados"
                >
                  🗑️ Eliminar {selectedProducts.size}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <p>Cargando...</p>
          ) : filteredProducts.length === 0 ? (
            <p>No hay cascos disponibles</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{width: '40px', textAlign: 'center'}}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
                        } else {
                          setSelectedProducts(new Set());
                        }
                      }}
                      style={{cursor: 'pointer', width: '18px', height: '18px'}}
                      title="Seleccionar todos"
                    />
                  </th>
                  <th>IMAGEN</th>
                  <th>NOMBRE</th>
                  <th>MARCA</th>
                  <th>PRECIO</th>
                  <th>PILOTO</th>
                  <th>STOCK</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td style={{textAlign: 'center', width: '40px'}}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedProducts);
                          if (e.target.checked) {
                            newSet.add(product.id);
                          } else {
                            newSet.delete(product.id);
                          }
                          setSelectedProducts(newSet);
                        }}
                        style={{cursor: 'pointer', width: '18px', height: '18px'}}
                      />
                    </td>
                    <td>
                      {product.imagen && (
                        <img src={product.imagen} alt={product.nombre} className={styles.tableImg} />
                      )}
                    </td>
                    <td className={styles.nameCell}>
                      <div>{product.nombre}</div>
                      <div className={styles.productMeta}>{product.tipo} • {Array.isArray(product.talla) ? product.talla.join(', ') || 'N/A' : product.talla || 'N/A'}</div>
                    </td>
                    <td>{product.marca}</td>
                    <td className={styles.priceCell}>S/ {product.precio}</td>
                    <td style={{fontWeight: '500', color: '#ff9159'}}>
                      {product.piloto || '-'}
                    </td>
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
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Ganancia Total</span>
              <span className={styles.metricValue}>
                S/ {(() => {
                  const totalGanancia = sales.reduce((sum, sale) => {
                    const product = products.find(p => p.id === sale.productoId);
                    const precioCompra = product?.precioCompra || 0;
                    const ganancia = ((sale.precioUnitario || 0) - precioCompra) * (sale.cantidad || 1);
                    return sum + ganancia;
                  }, 0);
                  return totalGanancia.toFixed(2);
                })()}
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
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', flexWrap: 'wrap'}}>
            <h2 className={styles.listTitle}>📋 Historial de Ventas</h2>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
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
              <button 
                onClick={handleExportToExcel}
                className={styles.exportBtn}
                title="Exportar ventas filtradas a Excel"
              >
                📊 Exportar
              </button>
            </div>
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

