import { Directory, File, Paths } from 'expo-file-system';

import { departmentForCategory } from '@/lib/categories';
import type { Product } from '@/lib/types';

function photoDirectory(): Directory {
  const directory = new Directory(Paths.document, 'photos');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

export function photoUri(imageName: string): string {
  return new File(Paths.document, 'photos', imageName).uri;
}

export async function persistPhoto(tempUri: string, imageName: string): Promise<void> {
  const directory = photoDirectory();
  const destination = new File(directory, imageName);
  const source = new File(tempUri);
  await source.copy(destination, { overwrite: true });
}

export async function copyPhoto(fromName: string, toName: string): Promise<void> {
  if (fromName === toName) return;
  const directory = photoDirectory();
  const source = new File(directory, fromName);
  const destination = new File(directory, toName);
  await source.copy(destination, { overwrite: true });
}

export function deletePhoto(imageName: string): void {
  const file = new File(Paths.document, 'photos', imageName);
  if (file.exists) file.delete();
}

function inventoryFile(): File {
  return new File(Paths.document, 'inventory.json');
}

function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<Product>;
  if (typeof item.id !== 'string' || typeof item.imageName !== 'string') return null;
  return {
    id: item.id,
    upc: typeof item.upc === 'string' && item.upc.length > 0 ? item.upc : null,
    imageName: item.imageName,
    category: typeof item.category === 'string' ? item.category : '',
    department:
      typeof item.department === 'string' && item.department
        ? item.department
        : departmentForCategory(typeof item.category === 'string' ? item.category : ''),
    audience: typeof item.audience === 'string' ? item.audience : '',
    sport: typeof item.sport === 'string' ? item.sport : '',
    size: typeof item.size === 'string' ? item.size : '',
    color: typeof item.color === 'string' ? item.color : '',
    brand: typeof item.brand === 'string' ? item.brand : '',
    quantity: typeof item.quantity === 'number' && item.quantity > 0 ? Math.round(item.quantity) : 1,
    notes: typeof item.notes === 'string' ? item.notes : '',
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
  };
}

export function loadProducts(): Product[] {
  const file = inventoryFile();
  if (!file.exists) return [];
  try {
    const parsed: unknown = JSON.parse(file.textSync());
    if (!Array.isArray(parsed)) {
      throw new Error('Inventory file is not a list.');
    }
    return parsed.map((item, index) => {
      const product = normalizeProduct(item);
      if (!product) throw new Error('Invalid product at position ' + (index + 1));
      return product;
    });
  } catch {
    // Returning [] would allow a later save to overwrite unreadable records.
    throw new Error('The saved inventory file is unreadable. Do not delete the app or its data.');
  }
}

export function saveProducts(products: Product[]): void {
  const file = inventoryFile();
  if (!file.exists) file.create();
  file.writeSync(JSON.stringify(products, null, 2));
}

export async function readPhotoBase64(imageName: string): Promise<string | null> {
  const file = new File(photoDirectory(), imageName);
  if (!file.exists) return null;
  const encoded = await file.base64();
  return encoded.replace(/\s/g, '');
}
