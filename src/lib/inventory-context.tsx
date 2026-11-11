import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { clearDraft } from '@/lib/draft';
import {
  deleteLocalInventoryFile,
  deleteLocalPhotoAndExportFiles,
  loadProducts,
  saveProducts,
} from '@/lib/storage';
import type { Product } from '@/lib/types';
import { upcsMatch } from '@/lib/upc';

type InventoryValue = {
  ready: boolean;
  loadError: string | null;
  products: Product[];
  findByUpc: (upc: string) => Product | null;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  incrementQuantity: (id: string) => void;
  clearLocalData: () => void;
};

const InventoryContext = createContext<InventoryValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadErrorRef = useRef<string | null>(null);
  const productsRef = useRef<Product[]>([]);

  useEffect(() => {
    try {
      const loaded = loadProducts();
      productsRef.current = loaded;
      setProducts(loaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read inventory.';
      loadErrorRef.current = message;
      setLoadError(message);
    } finally {
      setReady(true);
    }
  }, []);

  const commit = useCallback((next: Product[]) => {
    if (loadErrorRef.current) {
      throw new Error('Inventory is unavailable. Existing data was not changed.');
    }
    saveProducts(next);
    productsRef.current = next;
    setProducts(next);
  }, []);

  const ordered = useMemo(
    () => [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [products],
  );

  const findByUpc = useCallback((upc: string) => {
    return productsRef.current.find((product) => upcsMatch(product.upc, upc)) ?? null;
  }, []);

  const addProduct = useCallback(
    (product: Product) => {
      commit([product, ...productsRef.current]);
    },
    [commit],
  );

  const updateProduct = useCallback(
    (product: Product) => {
      commit(productsRef.current.map((item) => (item.id === product.id ? product : item)));
    },
    [commit],
  );

  const deleteProduct = useCallback(
    (id: string) => {
      commit(productsRef.current.filter((item) => item.id !== id));
    },
    [commit],
  );

  const incrementQuantity = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      commit(
        productsRef.current.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1, updatedAt: now } : item,
        ),
      );
    },
    [commit],
  );

  // Reset the saved inventory before deleting the photos. If media cleanup
  // fails, the inventory remains empty and the user can retry the reset.
  const clearLocalData = useCallback(() => {
    deleteLocalInventoryFile();
    productsRef.current = [];
    setProducts([]);
    loadErrorRef.current = null;
    setLoadError(null);
    clearDraft();
    deleteLocalPhotoAndExportFiles();
  }, []);

  const value = useMemo(
    () => ({
      ready,
      loadError,
      products: ordered,
      findByUpc,
      addProduct,
      updateProduct,
      deleteProduct,
      incrementQuantity,
      clearLocalData,
    }),
    [ready, loadError, ordered, findByUpc, addProduct, updateProduct, deleteProduct, incrementQuantity, clearLocalData],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryValue {
  const value = useContext(InventoryContext);
  if (!value) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return value;
}
