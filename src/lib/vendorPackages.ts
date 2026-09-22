export const GUEST_OPTIONS = [
  { value: '50', label: 'Intimate (Up to 50)' },
  { value: '150', label: 'Medium (100 - 200)' },
  { value: '350', label: 'Grand (250 - 500)' },
  { value: '800', label: 'Royal Palace (500+)' },
];

export const PACKAGE_TIER_MULTIPLIER: Record<string, number> = {
  SILVER: 1,
  GOLD: 1.5,
  PREMIUM: 2.2,
};

export type DisplayPackage = {
  id: string | null;
  package_tier: string;
  name: string;
  description: string;
  price: number;
};

export function packageTiersFromStartingPrice(startingPrice: number): DisplayPackage[] {
  const base = Number(startingPrice) || 15000;
  return [
    {
      id: null,
      package_tier: 'PREMIUM',
      name: 'Premium Package',
      description: 'Full 2-day coverage & priority execution',
      price: Math.round(base * 2.2),
    },
    {
      id: null,
      package_tier: 'GOLD',
      name: 'Royal Gold Package',
      description: '1-day ceremony with complete staff',
      price: Math.round(base * 1.5),
    },
    {
      id: null,
      package_tier: 'SILVER',
      name: 'Essential Silver',
      description: 'Standard single-event coverage & essentials',
      price: Math.round(base),
    },
  ];
}

export function displayPackages(vendorPackages: any[] | undefined, startingPrice: number): DisplayPackage[] {
  if (Array.isArray(vendorPackages) && vendorPackages.length > 0) {
    return vendorPackages.map((pkg) => ({
      id: pkg.id,
      package_tier: String(pkg.package_tier || pkg.tier || 'CUSTOM').toUpperCase(),
      name: pkg.name,
      description: pkg.description || 'Vendor package',
      price: Number(pkg.price) || 0,
    }));
  }
  return packageTiersFromStartingPrice(startingPrice);
}

export function amountForPackageTier(startingPrice: number, tier: string): number {
  const base = Number(startingPrice) || 15000;
  const multiplier = PACKAGE_TIER_MULTIPLIER[String(tier || '').toUpperCase()] || 1;
  return Math.round(base * multiplier);
}
