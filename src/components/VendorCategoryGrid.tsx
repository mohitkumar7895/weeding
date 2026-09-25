'use client';

import React from 'react';
import Link from 'next/link';
import { VENDOR_CATEGORIES } from '@/lib/vendorCategories';
import './vendor-category-grid.css';

export default function VendorCategoryGrid() {
  return (
    <div className="vcg">
      {VENDOR_CATEGORIES.map((cat) => (
        <Link key={cat.id} href={`/vendors/category/${cat.slug}`} className="vcg-card">
          <span className="vcg-num">{String(cat.display_order).padStart(2, '0')}</span>
          <img src={cat.image} alt={cat.name} />
          <span className="vcg-shade" />
          <span className="vcg-copy">
            <strong>{cat.name}</strong>
            <small>{cat.description}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}
