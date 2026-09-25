export type VendorCategoryDef = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  display_order: number;
  aliases: string[];
};

export const VENDOR_CATEGORIES: VendorCategoryDef[] = [
  {
    id: 'cat_venues',
    slug: 'venues',
    name: 'Resorts & Venues',
    description: 'Resorts, banquet halls, farmhouses and wedding venues.',
    image: '/images/categories/venues.png',
    display_order: 1,
    aliases: ['venue', 'venues', 'resort', 'resorts', 'banquet', 'hall'],
  },
  {
    id: 'cat_caterers',
    slug: 'caterers',
    name: 'Caterers',
    description: 'Wedding catering, live counters and banquet food.',
    image: '/images/categories/caterers.png',
    display_order: 2,
    aliases: ['caterer', 'caterers', 'catering', 'food'],
  },
  {
    id: 'cat_photographers',
    slug: 'photographers',
    name: 'Photo & Video Graphers',
    description: 'Wedding photography, cinematography and reels.',
    image: '/images/categories/photographers.png',
    display_order: 3,
    aliases: ['photographer', 'photographers', 'photo', 'video', 'cinematography'],
  },
  {
    id: 'cat_decorators',
    slug: 'decorators',
    name: 'Decorator',
    description: 'Mandap, floral and stage decoration.',
    image: '/images/categories/decorators.png',
    display_order: 4,
    aliases: ['decorator', 'decorators', 'decor', 'decoration'],
  },
  {
    id: 'cat_dj',
    slug: 'dj-music',
    name: 'Band & DJ',
    description: 'Live bands, DJs and wedding entertainment.',
    image: '/images/categories/dj-music.png',
    display_order: 5,
    aliases: ['dj', 'band', 'music', 'entertainment'],
  },
  {
    id: 'cat_makeup',
    slug: 'beauty-parlour',
    name: 'Beauti Parlour',
    description: 'Bridal makeup, hair, skincare and grooming.',
    image: '/images/categories/beauty-parlour.png',
    display_order: 6,
    aliases: ['makeup', 'beauty', 'parlour', 'parlor', 'bridal makeup'],
  },
  {
    id: 'cat_furniture_gifts',
    slug: 'furniture-gifts',
    name: 'Furniture & Electronics Gifts',
    description: 'Premium furniture, electronics and wedding gifts.',
    image: '/images/categories/furniture-gifts.png',
    display_order: 7,
    aliases: ['furniture', 'electronics', 'gifts'],
  },
  {
    id: 'cat_wedding_clothes',
    slug: 'wedding-clothes',
    name: "Men's & Women's Wedding Cloths",
    description: 'Designer outfits, sherwanis, lehengas and bridal wear.',
    image: '/images/categories/wedding-clothes.png',
    display_order: 8,
    aliases: ['clothes', 'cloths', 'attire', 'lehenga', 'sherwani', 'outfit'],
  },
  {
    id: 'cat_wedding_cards',
    slug: 'wedding-cards',
    name: 'Wedding Cards',
    description: 'Printed and customized wedding invitations.',
    image: '/images/categories/wedding-cards.png',
    display_order: 9,
    aliases: ['cards', 'invitation', 'invitations'],
  },
  {
    id: 'cat_honeymoon',
    slug: 'honeymoon',
    name: 'Honeymoon Services',
    description: 'Honeymoon packages, travel and destination planning.',
    image: '/images/categories/honeymoon.png',
    display_order: 10,
    aliases: ['honeymoon', 'travel', 'destination'],
  },
];

export function categoryImage(slug?: string | null): string {
  const found = VENDOR_CATEGORIES.find((c) => c.slug === slug || c.id === slug);
  return found?.image || '/images/categories/venues.png';
}

export function findVendorCategory(value?: string | null): VendorCategoryDef | undefined {
  const v = String(value || '').trim().toLowerCase();
  if (!v || v === 'all') return undefined;
  return VENDOR_CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === v ||
      c.slug.toLowerCase() === v ||
      c.name.toLowerCase() === v ||
      c.aliases.some((a) => a === v)
  );
}
