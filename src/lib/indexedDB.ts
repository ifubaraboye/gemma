const DB_NAME = "FlornDB";
const DB_VERSION = 1;
const STORE_CHATS = "chats";
const STORE_METADATA = "metadata";

export interface CachedChat {
  _id: string;
  messages: any[];
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      dbPromise = null; // Reset on error to allow retry
      reject(new Error("Error opening database"));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        db.createObjectStore(STORE_CHATS, { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA);
      }
    };
  });

  return dbPromise;
};

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    const request = callback(store);

    if (!request) {
      transaction.oncomplete = () => resolve(undefined as T);
      transaction.onerror = () => reject(transaction.error);
      return;
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const getCachedChat = async (chatId: string): Promise<CachedChat | undefined> => {
  return withStore<CachedChat>(STORE_CHATS, "readonly", (store) => store.get(chatId));
};

export const saveChatToCache = async (chat: CachedChat): Promise<void> => {
  return withStore<void>(STORE_CHATS, "readwrite", (store) => {
    store.put(chat);
  });
};

export const getCachedChatList = async (): Promise<any[] | undefined> => {
  return withStore<any[]>(STORE_METADATA, "readonly", (store) => store.get("chatList"));
};

export const saveChatListToCache = async (chatList: any[]): Promise<void> => {
  return withStore<void>(STORE_METADATA, "readwrite", (store) => {
    store.put(chatList, "chatList");
  });
};

export const deleteCachedChat = async (chatId: string): Promise<void> => {
  return withStore<void>(STORE_CHATS, "readwrite", (store) => {
    store.delete(chatId);
  });
};
