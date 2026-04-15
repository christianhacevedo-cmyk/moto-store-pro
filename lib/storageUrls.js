import { ref, getDownloadURL, listAll } from 'firebase/storage';
import { storage } from './firebase';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export const getLandingPageImages = async () => {
  // Try to get from cache first
  const cached = getCachedImages();
  if (cached) {
    return cached;
  }

  try {
    // List all files in landing-page folder
    const folderRef = ref(storage, 'landing-page');
    const result = await listAll(folderRef);

    // Find files by name (ignoring extension)
    const cascoFile = result.items.find(item => item.name.startsWith('casco'));
    const accesoriosFile = result.items.find(item => item.name.startsWith('accesorios'));
    const promocionesFile = result.items.find(item => item.name.startsWith('promociones'));

    // Get download URLs
    const [cascoUrl, accesoriosUrl, promocionesUrl] = await Promise.all([
      cascoFile ? getDownloadURL(cascoFile) : Promise.resolve(''),
      accesoriosFile ? getDownloadURL(accesoriosFile) : Promise.resolve(''),
      promocionesFile ? getDownloadURL(promocionesFile) : Promise.resolve(''),
    ]);

    const imageUrls = {
      cascos: cascoUrl,
      accesorios: accesoriosUrl,
      promociones: promocionesUrl,
    };

    // Save to cache
    setCachedImages(imageUrls);

    return imageUrls;
  } catch (error) {
    console.error('Error fetching landing page images:', error);
    // Try to return cached data even if expired (better than nothing)
    const expiredCache = getCachedImages(true);
    if (expiredCache) {
      return expiredCache;
    }
    // Fallback if no cache at all
    return {
      cascos: '',
      accesorios: '',
      promociones: '',
    };
  }
};

const getCachedImages = (ignoreExpiration = false) => {
  try {
    const cached = localStorage.getItem('landing_images');
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache is still valid (unless ignoreExpiration is true for fallback)
    if (!ignoreExpiration && Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem('landing_images');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null;
  }
};

const setCachedImages = (data) => {
  try {
    localStorage.setItem(
      'landing_images',
      JSON.stringify({
        data,
        timestamp: Date.now()
      })
    );
  } catch (error) {
    console.error('Cache save error:', error);
  }
};

export const clearLandingImageCache = () => {
  localStorage.removeItem('landing_images');
};
