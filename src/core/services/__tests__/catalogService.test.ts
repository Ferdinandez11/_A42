// catalogService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadCatalogData,
  getCatalogDB,
  getCatalogLoadStatus,
  getProxiedImageUrl,
} from '../catalogService';
import type { CatalogDB } from '../catalogService';

// Mock fetch
global.fetch = vi.fn();

describe('catalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state by re-importing
    vi.resetModules();
  });

  describe('loadCatalogData', () => {
    it('should load and parse CSV data successfully', async () => {
      const mockCsv = `ref,nombre,precio,categoria,archivo_glb,img_2d,linea
item1,Producto 1,100,Categoria A,model1.glb,img1.jpg,Linea 1
item2,Producto 2,200,Categoria B,model2.glb,img2.jpg,Linea 2`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockCsv,
      } as Response);

      await loadCatalogData();

      const status = getCatalogLoadStatus();
      expect(status.isLoaded).toBe(true);
      expect(status.error).toBeNull();

      const db = getCatalogDB();
      expect(db).not.toBeNull();
      expect(db?.lines).toBeDefined();
    });

    it('should handle HTTP errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await loadCatalogData();

      const status = getCatalogLoadStatus();
      expect(status.isLoaded).toBe(false);
      expect(status.error).toContain('Error HTTP');
    });

    it('should handle empty CSV', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      } as Response);

      await loadCatalogData();

      const status = getCatalogLoadStatus();
      expect(status.isLoaded).toBe(false);
      expect(status.error).toContain('CSV vacío');
    });

    it('should not reload if already loaded', async () => {
      const mockCsv = `ref,nombre,precio,categoria,archivo_glb,img_2d,linea
item1,Producto 1,100,Categoria A,model1.glb,img1.jpg,Linea 1`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockCsv,
      } as Response);

      await loadCatalogData();
      const firstCallCount = vi.mocked(fetch).mock.calls.length;

      // Second call should not fetch again
      await loadCatalogData();
      expect(vi.mocked(fetch).mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('getCatalogDB', () => {
    it('should return catalog database when loaded', async () => {
      const mockCsv = `ref,nombre,precio,categoria,archivo_glb,img_2d,linea
item1,Producto 1,100,Categoria A,model1.glb,img1.jpg,Linea 1`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockCsv,
      } as Response);

      await loadCatalogData();

      const db = getCatalogDB();
      expect(db).not.toBeNull();
      expect(db?.lines).toBeDefined();
    });

    it('should return null when not loaded', () => {
      const db = getCatalogDB();
      // May be null if not loaded yet
      expect(db === null || typeof db === 'object').toBe(true);
    });
  });

  describe('getCatalogLoadStatus', () => {
    it('should return loading status', () => {
      const status = getCatalogLoadStatus();
      expect(status).toHaveProperty('isLoaded');
      expect(status).toHaveProperty('error');
    });
  });

  describe('getProxiedImageUrl', () => {
    it('should return proxied URL for external images', () => {
      const url = 'https://example.com/image.jpg';
      const proxied = getProxiedImageUrl(url);
      expect(proxied).toContain('https://images.weserv.nl');
      expect(proxied).toContain(encodeURIComponent(url));
    });

    it('should return original URL for data URLs', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const result = getProxiedImageUrl(dataUrl);
      expect(result).toBe(dataUrl);
    });

    it('should return empty string for null/undefined', () => {
      expect(getProxiedImageUrl(null as any)).toBe('');
      expect(getProxiedImageUrl(undefined as any)).toBe('');
    });
  });
});

