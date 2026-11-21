export const TASBIH_STORAGE_KEY = "allah-tasbih-state-v1";
export const MUHASABAH_STORAGE_KEY = "allah-muhasabah-v1";
export const MUHASABAH_JOURNAL_LS_KEY = "allah-muhasabah-journal-v1";
const MUHASABAH_IDB_NAME = "allah-sanctuary-local";
const MUHASABAH_IDB_STORE = "journal";

export interface PrivateJournalEntry {
  readonly id: string;
  readonly createdAt: string;
  readonly text: string;
}

export interface PersistedTasbihState {
  readonly phraseId: string;
  readonly count: number;
  readonly cycles: number;
  readonly totalWitnessed: number;
}

export const MUHASABAH_PLEDGES = [
  {
    id: "restitution",
    labelEn: "Fulfill trust & settle any debt owed",
    labelId: "Tunaikan amanah & lunasi hak sesama",
  },
  {
    id: "gentle-speech",
    labelEn: "Guard tongue from mockery or falsehood",
    labelId: "Jaga lisan dari dusta & merendahkan",
  },
  {
    id: "hidden-mercy",
    labelEn: "Offer unseen kindness without applause",
    labelId: "Beri kebaikan senyap tanpa mencari pujian",
  },
  {
    id: "honest-craft",
    labelEn: "Deliver clean, verifiable work as worship",
    labelId: "Hasilkan karya jujur & teruji sebagai ibadah",
  },
] as const;

export function readIdbJournalEntries(): Promise<readonly PrivateJournalEntry[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      resolve([]);
      return;
    }
    try {
      const req = window.indexedDB.open(MUHASABAH_IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MUHASABAH_IDB_STORE)) {
          db.createObjectStore(MUHASABAH_IDB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(MUHASABAH_IDB_STORE, "readonly");
        const store = tx.objectStore(MUHASABAH_IDB_STORE);
        const allReq = store.getAll();
        allReq.onsuccess = () => {
          const rows = Array.isArray(allReq.result) ? (allReq.result as PrivateJournalEntry[]) : [];
          resolve(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
          db.close();
        };
        allReq.onerror = () => {
          resolve([]);
          db.close();
        };
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export function writeIdbJournalEntry(entry: PrivateJournalEntry): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      resolve(false);
      return;
    }
    try {
      const req = window.indexedDB.open(MUHASABAH_IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MUHASABAH_IDB_STORE)) {
          db.createObjectStore(MUHASABAH_IDB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(MUHASABAH_IDB_STORE, "readwrite");
        tx.objectStore(MUHASABAH_IDB_STORE).put(entry);
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          resolve(false);
        };
      };
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export function deleteIdbJournalEntry(id: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      resolve();
      return;
    }
    try {
      const req = window.indexedDB.open(MUHASABAH_IDB_NAME, 1);
      req.onsuccess = () => {
        const db = req.result;
        if (db.objectStoreNames.contains(MUHASABAH_IDB_STORE)) {
          const tx = db.transaction(MUHASABAH_IDB_STORE, "readwrite");
          tx.objectStore(MUHASABAH_IDB_STORE).delete(id);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } else {
          db.close();
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
