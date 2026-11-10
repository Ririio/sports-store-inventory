export type CategoryGroup = {
  title: string;
  items: string[];
};

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: 'Headwear',
    items: [
      'Baseball Cap',
      'Snapback',
      'Fitted Cap',
      'Toque',
      'Beanie',
      'Visor',
      'Bucket Hat',
      'Headband',
      'Balaclava',
    ],
  },
  {
    title: 'Tops',
    items: [
      'Jersey',
      'T-Shirt',
      'Long Sleeve',
      'Hoodie',
      'Crewneck',
      'Polo',
      'Tank Top',
      'Compression Shirt',
      'Pinnie',
    ],
  },
  {
    title: 'Outerwear',
    items: ['Jacket', 'Windbreaker', 'Vest', 'Rain Jacket', 'Parka'],
  },
  {
    title: 'Bottoms',
    items: ['Shorts', 'Pants', 'Joggers', 'Leggings', 'Compression Shorts'],
  },
  {
    title: 'Footwear',
    items: ['Cleats', 'Runners', 'Trainers', 'Slides', 'Skates'],
  },
  {
    title: 'Accessories',
    items: [
      'Gloves',
      'Socks',
      'Scarf',
      'Neck Gaiter',
      'Bag',
      'Backpack',
      'Wristband',
      'Belt',
    ],
  },
  {
    title: 'Gear',
    items: ['Helmet', 'Pads', 'Shin Guards', 'Stick', 'Puck', 'Ball'],
  },
  { title: 'Other', items: [] },
];

export const KNOWN_CATEGORIES = new Set(CATEGORY_GROUPS.flatMap((group) => group.items));

// A broad department is useful during a rapid stock count, even when the
// exact product subtype is unknown. Existing saved items can infer this.
export function departmentForCategory(category: string): string {
  if (!category) return '';
  const group = CATEGORY_GROUPS.find(
    (entry) => entry.title === category || entry.items.includes(category),
  );
  return group?.title ?? 'Other';
}

export const AUDIENCES = ['Men', 'Women', 'Youth', 'Unisex'] as const;

export const SPORTS = [
  'Hockey',
  'Baseball',
  'Basketball',
  'Football',
  'Soccer',
  'Golf',
  'Running',
  'Training',
  'Lacrosse',
  'Tennis',
  'Volleyball',
  'General',
];

export const SIZES = [
  'YXS',
  'YS',
  'YM',
  'YL',
  'YXL',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'OSFA',
];

const ADULT_APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const YOUTH_APPAREL_SIZES = ['YXS', 'YS', 'YM', 'YL', 'YXL'];
const HEADWEAR_SIZES = ['OSFA', 'Adjustable', 'S/M', 'M/L', 'L/XL'];
const FITTED_HEADWEAR_SIZES = [
  '6 3/4', '6 7/8', '7', '7 1/8', '7 1/4', '7 3/8',
  '7 1/2', '7 5/8', '7 3/4', '7 7/8', '8',
];
const FOOTWEAR_SIZES = [
  'US 5', 'US 6', 'US 7', 'US 8', 'US 8.5', 'US 9',
  'US 9.5', 'US 10', 'US 10.5', 'US 11', 'US 12', 'US 13',
];
const YOUTH_FOOTWEAR_SIZES = ['US 1Y', 'US 2Y', 'US 3Y', 'US 4Y', 'US 5Y', 'US 6Y', 'US 7Y'];

// Suggestions only: keep the size field editable for uncommon labels, non-US
// shoes, vintage merchandise, and any size not in the quick choices.
export function sizeOptionsFor(department: string, audience: string, category: string): string[] {
  const youth = audience === 'Youth';
  switch (department) {
    case 'Tops':
    case 'Outerwear':
      return youth ? YOUTH_APPAREL_SIZES : audience ? ADULT_APPAREL_SIZES : SIZES;
    case 'Bottoms':
      return youth
        ? [...YOUTH_APPAREL_SIZES, '6', '8', '10', '12', '14', '16']
        : [...ADULT_APPAREL_SIZES, '28', '30', '32', '34', '36', '38', '40'];
    case 'Headwear':
      return category === 'Fitted Cap' ? FITTED_HEADWEAR_SIZES : HEADWEAR_SIZES;
    case 'Footwear':
      return youth ? YOUTH_FOOTWEAR_SIZES : FOOTWEAR_SIZES;
    case 'Accessories':
      return ['OSFA', 'S/M', 'M/L', 'L/XL', 'S', 'M', 'L', 'XL'];
    case 'Gear':
      return ['Youth', 'Junior', 'Senior', 'OSFA', 'XS', 'S', 'M', 'L', 'XL'];
    default:
      return SIZES;
  }
}

export function sizeHintFor(department: string): string {
  if (department === 'Footwear') return 'Suggested US shoe sizes. Enter another size or system below.';
  if (department === 'Headwear') return 'Common cap sizes. Choose Fitted Cap for fitted hat sizes.';
  return 'Optional. Suggestions depend on department and audience; enter any other size below.';
}

export const COLORS = [
  'Black',
  'White',
  'Navy',
  'Royal',
  'Red',
  'Green',
  'Grey',
  'Gold',
  'Orange',
  'Purple',
  'Pink',
  'Camo',
  'Multi',
];
