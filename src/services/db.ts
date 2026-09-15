import { ProjectMeta, FrameItem } from '../types';

const DB_NAME = 'komadori_db';
const DB_VERSION = 1;

export interface StoredFrameRecord {
  id?: number;
  order: number;
  image: Blob;
  createdAt: number;
}

export async function loadSavedFrames(): Promise<FrameItem[]> {
  const records = await getAllStoredFrames();
  return records.map((rec) => ({
    id: rec.id!,
    order: rec.order,
    blob: rec.image,
    url: URL.createObjectURL(rec.image),
    createdAt: rec.createdAt,
  }));
}

export async function deleteLastFrame(lastIndex: number): Promise<void> {
  const records = await getAllStoredFrames();
  const lastRecord = records.find((r) => r.order === lastIndex);
  if (lastRecord && lastRecord.id !== undefined) {
    await deleteSingleFrame(lastRecord.id);
  }
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('frames')) {
        const frameStore = db.createObjectStore('frames', { keyPath: 'id', autoIncrement: true });
        frameStore.createIndex('order', 'order', { unique: false });
      }
      if (!db.objectStoreNames.contains('projectMeta')) {
        db.createObjectStore('projectMeta', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllStoredFrames(): Promise<StoredFrameRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('frames', 'readonly');
    const store = tx.objectStore('frames');
    const request = store.getAll();

    request.onsuccess = () => {
      const results = (request.result as StoredFrameRecord[]) || [];
      results.sort((a, b) => a.order - b.order);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveSingleFrame(imageBlob: Blob, order: number): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['frames', 'projectMeta'], 'readwrite');
    const frameStore = tx.objectStore('frames');
    const metaStore = tx.objectStore('projectMeta');

    const record: StoredFrameRecord = {
      order,
      image: imageBlob,
      createdAt: Date.now(),
    };

    const addReq = frameStore.add(record);
    addReq.onsuccess = () => {
      const newId = addReq.result as number;
      // Also update meta timestamp
      metaStore.put({
        id: 'current',
        lastUpdated: Date.now(),
      });
      resolve(newId);
    };
    addReq.onerror = () => reject(addReq.error);
  });
}

export async function deleteSingleFrame(frameId: number): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['frames', 'projectMeta'], 'readwrite');
    const frameStore = tx.objectStore('frames');
    const metaStore = tx.objectStore('projectMeta');

    frameStore.delete(frameId);

    const getAllReq = frameStore.getAll();
    getAllReq.onsuccess = () => {
      const list = (getAllReq.result as StoredFrameRecord[]) || [];
      list.sort((a, b) => a.order - b.order);
      list.forEach((item, index) => {
        if (item.order !== index) {
          item.order = index;
          frameStore.put(item);
        }
      });
      metaStore.put({
        id: 'current',
        lastUpdated: Date.now(),
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMultipleStoredFrames(frameIds: number[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['frames', 'projectMeta'], 'readwrite');
    const frameStore = tx.objectStore('frames');
    const metaStore = tx.objectStore('projectMeta');
    const idsSet = new Set(frameIds);

    const getAllReq = frameStore.getAll();
    getAllReq.onsuccess = () => {
      const list = (getAllReq.result as StoredFrameRecord[]) || [];
      list.forEach((item) => {
        if (item.id !== undefined && idsSet.has(item.id)) {
          frameStore.delete(item.id);
        }
      });

      const remaining = list.filter((item) => item.id !== undefined && !idsSet.has(item.id));
      remaining.sort((a, b) => a.order - b.order);
      remaining.forEach((item, index) => {
        if (item.order !== index) {
          item.order = index;
          frameStore.put(item);
        }
      });

      metaStore.put({
        id: 'current',
        lastUpdated: Date.now(),
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateFramesOrdering(orderedIds: number[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['frames', 'projectMeta'], 'readwrite');
    const frameStore = tx.objectStore('frames');
    const metaStore = tx.objectStore('projectMeta');

    const getAllReq = frameStore.getAll();
    getAllReq.onsuccess = () => {
      const list = (getAllReq.result as StoredFrameRecord[]) || [];
      const map = new Map<number, StoredFrameRecord>();
      list.forEach((rec) => {
        if (rec.id !== undefined) map.set(rec.id, rec);
      });

      orderedIds.forEach((id, newOrder) => {
        const item = map.get(id);
        if (item) {
          item.order = newOrder;
          frameStore.put(item);
        }
      });

      metaStore.put({
        id: 'current',
        lastUpdated: Date.now(),
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllProjectData(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['frames', 'projectMeta'], 'readwrite');
    tx.objectStore('frames').clear();
    tx.objectStore('projectMeta').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadProjectMeta(): Promise<ProjectMeta | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projectMeta', 'readonly');
    const store = tx.objectStore('projectMeta');
    const req = store.get('current');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProjectMeta(meta: Partial<ProjectMeta>): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projectMeta', 'readwrite');
    const store = tx.objectStore('projectMeta');
    const getReq = store.get('current');
    getReq.onsuccess = () => {
      const existing = getReq.result || { id: 'current', frameRate: 8, title: 'コマ撮り作品' };
      store.put({
        ...existing,
        ...meta,
        id: 'current',
        lastUpdated: Date.now(),
      });
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
