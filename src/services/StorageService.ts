import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';

interface CachedAnalysis {
    url: string;
    content: string;
    result: any;
    timestamp: number;
    language: string;
}

class StorageService {
    private dbName = 'terms-analyzer-cache';
    private dbVersion = 1;
    private db: IDBPDatabase | null = null;

    async init() {
        this.db = await openDB(this.dbName, this.dbVersion, {
            upgrade(db: IDBPDatabase) {
                if (!db.objectStoreNames.contains('analyses')) {
                    db.createObjectStore('analyses', { keyPath: 'url' });
                }
            },
        });
    }

    async cacheAnalysis(url: string, content: string, result: any, language: string) {
        if (!this.db) await this.init();

        const cacheEntry: CachedAnalysis = {
            url,
            content,
            result,
            timestamp: Date.now(),
            language
        };

        await this.db!.put('analyses', cacheEntry);
    }

    async getCachedAnalysis(url: string, language: string): Promise<CachedAnalysis | null> {
        if (!this.db) await this.init();

        const entry = await this.db!.get('analyses', url);

        if (!entry) return null;
        if (entry.language !== language) return null;

        // Cache is valid for 24 hours
        const cacheAge = Date.now() - entry.timestamp;
        if (cacheAge > 24 * 60 * 60 * 1000) return null;

        return entry;
    }

    async clearOldCache() {
        if (!this.db) await this.init();

        const all = await this.db!.getAll('analyses');
        const day = 24 * 60 * 60 * 1000;

        for (const entry of all) {
            if (Date.now() - entry.timestamp > day) {
                await this.db!.delete('analyses', entry.url);
            }
        }
    }
}

export const storageService = new StorageService();
