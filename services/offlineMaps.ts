


// This service manages storing map images (tiles) in IndexedDB for offline usage.

const DB_NAME = 'gemini_map_cache';
const STORE_NAME = 'tiles';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event: any) => resolve(event.target.result);
      request.onerror = (event: any) => reject(event.target.error);
    });
  }
  return dbPromise;
};

// Convert Lat/Lng/Zoom to Tile Coordinates (Slippy Map logic)
const long2tile = (lon: number, zoom: number) => (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
const lat2tile = (lat: number, zoom: number) => (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));

export const offlineMaps = {
  
  // Save a specific tile blob
  async saveTile(x: number, y: number, z: number, blob: Blob) {
    const db = await getDB();
    const key = `${z}/${x}/${y}`;
    
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, blob, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // Get a tile blob
  async getTile(x: number, y: number, z: number): Promise<Blob | null> {
    const db = await getDB();
    const key = `${z}/${x}/${y}`;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result ? request.result.blob : null);
      };
      request.onerror = () => resolve(null);
    });
  },

  // Calculate total tiles to download for current bounds
  estimateTileCount(bounds: any, minZoom: number, maxZoom: number) {
    let count = 0;
    for (let z = minZoom; z <= maxZoom; z++) {
        const top = lat2tile(bounds.getNorth(), z);
        const left = long2tile(bounds.getWest(), z);
        const bottom = lat2tile(bounds.getSouth(), z);
        const right = long2tile(bounds.getEast(), z);
        count += (Math.abs(right - left) + 1) * (Math.abs(bottom - top) + 1);
    }
    return count;
  },

  // Download area logic
  async downloadArea(
      bounds: any, 
      minZoom: number, 
      maxZoom: number, 
      onProgress: (progress: number, total: number) => void
  ) {
    const tasks: {x: number, y: number, z: number}[] = [];

    // 1. Generate list of all tiles needed
    for (let z = minZoom; z <= maxZoom; z++) {
        const top = lat2tile(bounds.getNorth(), z);
        const left = long2tile(bounds.getWest(), z);
        const bottom = lat2tile(bounds.getSouth(), z);
        const right = long2tile(bounds.getEast(), z);

        for (let x = left; x <= right; x++) {
            for (let y = top; y <= bottom; y++) {
                tasks.push({ x, y, z });
            }
        }
    }

    // 2. Process downloads (with simple concurrency limit)
    let completed = 0;
    const total = tasks.length;
    
    // Using Esri Satellite as source
    const getUrl = (x: number, y: number, z: number) => 
        `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

    const downloadTile = async (task: {x: number, y: number, z: number}) => {
        try {
            // Check if exists first
            const existing = await this.getTile(task.x, task.y, task.z);
            if (!existing) {
                const response = await fetch(getUrl(task.x, task.y, task.z));
                const blob = await response.blob();
                await this.saveTile(task.x, task.y, task.z, blob);
            }
        } catch (e) {
            console.error(`Failed to download tile ${task.z}/${task.x}/${task.y}`, e);
        } finally {
            completed++;
            onProgress(completed, total);
        }
    };

    // Run in batches of 5 to avoid killing the network
    const BATCH_SIZE = 5;
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(downloadTile));
    }
  },
  
  async clearCache() {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
  }
};
