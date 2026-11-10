import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';

import { exportedPhotoPath } from '@/lib/exportPhotoPath';
import { buildSpreadsheetBase64 } from '@/lib/spreadsheet';
import { readPhotoBase64 } from '@/lib/storage';
import type { Product } from '@/lib/types';

export type ExportKind = 'sheet' | 'zip';

function exportDirectory(): Directory {
  const directory = new Directory(Paths.cache, 'exports');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

function datedName(extension: string): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `apparel-inventory-${stamp}.${extension}`;
}

function writeBase64(name: string, base64: string): File {
  const file = new File(exportDirectory(), name);
  if (file.exists) file.delete();
  file.create();
  file.writeSync(base64, { encoding: 'base64' });
  return file;
}

async function share(file: File, mimeType: string, uti: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this phone.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType,
    UTI: uti,
    dialogTitle: 'Export inventory',
  });
}

export async function exportInventory(products: Product[], kind: ExportKind): Promise<void> {
  if (kind === 'sheet') {
    // Spreadsheet-only export keeps the original on-phone photo references.
    const spreadsheet = await buildSpreadsheetBase64(products);
    const file = writeBase64(datedName('xlsx'), spreadsheet);
    await share(
      file,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'org.openxmlformats.spreadsheetml.sheet',
    );
    return;
  }

  // Export a separate view of each record; never rename a phone photo or mutate
  // the product objects used by the app.
  const exportedProducts = products.map((product) => ({
    ...product,
    imageName: exportedPhotoPath(product),
  }));
  const zip = new JSZip();
  const usedPaths = new Set<string>();

  for (let index = 0; index < products.length; index += 1) {
    const original = products[index];
    const exportPath = exportedProducts[index].imageName;
    if (usedPaths.has(exportPath)) {
      throw new Error(`Two items use the same export photo path: ${exportPath}`);
    }
    usedPaths.add(exportPath);

    const photo = await readPhotoBase64(original.imageName);
    if (!photo) {
      // A "full backup" must not silently omit an image that JSON refers to.
      throw new Error(`Photo missing for item ${original.id}. Full ZIP export was stopped.`);
    }
    zip.file(exportPath, photo, { base64: true });
  }

  zip.file('inventory.xlsx', await buildSpreadsheetBase64(exportedProducts), { base64: true });
  zip.file('inventory.json', JSON.stringify(exportedProducts, null, 2));
  // Keep the source records too, including their original photo filenames,
  // so a future restoration tool can recover the app's on-phone naming.
  zip.file('inventory-original.json', JSON.stringify(products, null, 2));
  zip.file(
    'README.txt',
    [
      'The Sports Store - Inventory Export',
      '',
      'inventory.xlsx and inventory.json: product data with imageName set to the',
      'matching relative photo path inside this archive.',
      'inventory-original.json: unchanged app records, including source imageName.',
      'photos/<Department>/: exported copies grouped by department.',
      '',
      'The photos stored on the phone are not renamed or moved.',
      'The ZIP is a complete export, but direct restore into the app is not',
      'implemented. A future restore tool can match records by product id and',
      'recover original image filenames using inventory-original.json.',
      '',
    ].join('\n'),
  );
  const zipped = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
  const file = writeBase64(datedName('zip'), zipped);
  await share(file, 'application/zip', 'public.zip-archive');
}
