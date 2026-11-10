import JSZip from 'jszip';

import { formatStamp, productName } from '@/lib/format';
import type { Product } from '@/lib/types';

type Cell = string | number;

const COLUMNS: { header: string; width: number; value: (product: Product) => Cell }[] = [
  { header: 'Product Name', width: 42, value: (product) => productName(product) },
  { header: 'Item ID', width: 24, value: (product) => product.id },
  { header: 'UPC', width: 16, value: (product) => product.upc ?? '' },
  { header: 'Has Barcode', width: 14, value: (product) => (product.upc ? 'Yes' : 'No') },
  { header: 'Image File Name', width: 40, value: (product) => product.imageName },
  { header: 'Department', width: 20, value: (product) => product.department },
  { header: 'Audience', width: 16, value: (product) => product.audience },
  { header: 'Category', width: 20, value: (product) => product.category },
  { header: 'Sport', width: 14, value: (product) => product.sport },
  { header: 'Size', width: 12, value: (product) => product.size },
  { header: 'Color', width: 14, value: (product) => product.color },
  { header: 'Brand', width: 18, value: (product) => product.brand },
  { header: 'Quantity', width: 10, value: (product) => product.quantity },
  { header: 'Notes', width: 32, value: (product) => product.notes },
  { header: 'Date Added', width: 20, value: (product) => formatStamp(product.createdAt) },
  { header: 'Last Updated', width: 20, value: (product) => formatStamp(product.updatedAt) },
];

function columnName(index: number): string {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function xmlEscape(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellXml(column: number, row: number, value: Cell): string {
  const ref = `${columnName(column)}${row}`;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(value))}</t></is></c>`;
}

function worksheetXml(products: Product[]): string {
  const ordered = [...products].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const rows: Cell[][] = [
    COLUMNS.map((column) => column.header),
    ...ordered.map((product) => COLUMNS.map((column) => column.value(product))),
  ];
  const cols = COLUMNS.map(
    (column, index) =>
      `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`,
  ).join('');
  const body = rows
    .map((row, rowIndex) => {
      const cells = row.map((value, columnIndex) => cellXml(columnIndex, rowIndex + 1, value)).join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${cols}</cols>
  <sheetData>${body}</sheetData>
</worksheet>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Inventory" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

export async function buildSpreadsheetBase64(products: Product[]): Promise<string> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('_rels/.rels', ROOT_RELS);
  zip.file('xl/workbook.xml', WORKBOOK);
  zip.file('xl/_rels/workbook.xml.rels', WORKBOOK_RELS);
  zip.file('xl/worksheets/sheet1.xml', worksheetXml(products));
  return zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
}
