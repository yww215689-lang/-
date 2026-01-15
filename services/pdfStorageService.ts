
import { PDFMetadata } from "../types";

// Simple IndexedDB wrapper for storing PDF Blobs and Metadata
const DB_NAME = 'SmartBrushPDFs';
const FILE_STORE = 'files';
const META_STORE = 'metadata';
const VERSION = 2; // Upgrade to version 2 to include metadata store

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store for heavy binary files
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE);
      }
      
      // Store for metadata (replacing localStorage for reliability)
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject('IndexedDB error: ' + (event.target as IDBOpenDBRequest).error);
    };
  });
};

// --- File Operations ---

export const savePDFBlob = async (id: string, file: File): Promise<void> => {
  const db = await openDB();
  // Ensure we store a pure Blob, not a File object which might depend on transient OS permissions
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE, 'readwrite');
    const store = transaction.objectStore(FILE_STORE);
    const request = store.put(blob, id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Failed to save PDF Blob');
  });
};

export const getPDFBlob = async (id: string): Promise<Blob | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE, 'readonly');
    const store = transaction.objectStore(FILE_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as Blob);
    request.onerror = () => reject('Failed to get PDF Blob');
  });
};

export const deletePDFBlob = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILE_STORE, META_STORE], 'readwrite');
    
    // Delete file
    const fileStore = transaction.objectStore(FILE_STORE);
    fileStore.delete(id);
    
    // Delete metadata
    const metaStore = transaction.objectStore(META_STORE);
    metaStore.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject('Failed to delete PDF Data');
  });
};

// --- Metadata Operations ---

export const savePDFMetadata = async (metadata: PDFMetadata): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(META_STORE, 'readwrite');
        const store = transaction.objectStore(META_STORE);
        const request = store.put(metadata);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Failed to save metadata');
    });
};

export const getAllPDFMetadata = async (): Promise<PDFMetadata[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(META_STORE, 'readonly');
        const store = transaction.objectStore(META_STORE);
        const request = store.getAll();
        
        request.onsuccess = () => {
             // Ensure result is array
             const res = request.result;
             resolve(Array.isArray(res) ? res : []);
        };
        request.onerror = () => reject('Failed to fetch metadata');
    });
};

export const updatePDFMetadata = async (id: string, updates: Partial<PDFMetadata>): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(META_STORE, 'readwrite');
        const store = transaction.objectStore(META_STORE);
        
        const getReq = store.get(id);
        
        getReq.onsuccess = () => {
            const data = getReq.result;
            if (data) {
                const newData = { ...data, ...updates };
                store.put(newData);
                resolve();
            } else {
                reject("Item not found");
            }
        };
        
        getReq.onerror = () => reject("Error finding item");
    });
};
