import type { Product } from './types';

// Names are only changed in ZIP exports. The app's original photo filenames
// stay untouched, so editing product details doesn't rename local files.
function filenamePart(value: string, fallback = ''): string {
  const safe = value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
    .replace(/_+$/g, '');
  return safe || fallback;
}

export function exportedPhotoPath(product: Product): string {
  const department = filenamePart(product.department || 'Other', 'Other');
  const audience = filenamePart(product.audience || 'Unknown', 'Unknown');
  const sport = filenamePart(product.sport);
  const type =
    product.category && product.category.toLowerCase() !== department.toLowerCase()
      ? filenamePart(product.category)
      : '';
  const barcode = filenamePart(product.upc ?? '', 'NOUPC');
  // Preserve the whole app-generated ID to distinguish same-type products.
  const id = filenamePart(product.id, 'NOID');
  const extension = /\.(jpg|jpeg|png|webp|heic)$/i.exec(product.imageName)?.[1]?.toLowerCase() ?? 'jpg';

  return `photos/${department}/${[audience, sport, type, barcode, id].filter(Boolean).join('_')}.${extension}`;
}
