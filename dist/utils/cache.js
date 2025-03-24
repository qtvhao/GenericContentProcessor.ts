// ./src/utils
// └── cache.ts
import { promises as fs } from 'fs';
import path from 'path';
const CACHE_DIR = './cache';
export async function readCache(cacheKey) {
    try {
        const filePath = path.join(CACHE_DIR, `${cacheKey}`);
        return await fs.readFile(filePath);
    }
    catch (error) {
        return null;
    }
}
export async function writeCache(cacheKey, data) {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        const filePath = path.join(CACHE_DIR, `${cacheKey}`);
        await fs.writeFile(filePath, data);
    }
    catch (error) {
        console.error('Error writing cache:', error);
    }
}
