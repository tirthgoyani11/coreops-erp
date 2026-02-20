import type { StateStorage } from 'zustand/middleware';

/**
 * A safe wrapper around localStorage that ignores DOMExceptions 
 * when storage access is denied (e.g. in cross-origin iframes or strict privacy modes).
 * 
 * Falls back to an in-memory dictionary if localStorage throws an error.
 */

class SafeStorage implements StateStorage {
    private inMemoryStorage = new Map<string, string>();

    getItem(name: string): string | null {
        try {
            return localStorage.getItem(name);
        } catch (e) {
            console.warn(`[SafeStorage] Could not read from localStorage for key ${name}. Falling back to memory string.`);
            return this.inMemoryStorage.get(name) || null;
        }
    }

    setItem(name: string, value: string): void {
        try {
            localStorage.setItem(name, value);
        } catch (e) {
            console.warn(`[SafeStorage] Could not write to localStorage for key ${name}. Storing in memory instead.`);
            this.inMemoryStorage.set(name, value);
        }
    }

    removeItem(name: string): void {
        try {
            localStorage.removeItem(name);
        } catch (e) {
            this.inMemoryStorage.delete(name);
        }
    }
}

export const safeLocalStorage = new SafeStorage();
