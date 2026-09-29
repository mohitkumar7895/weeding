'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import VendorCategoryGrid from '@/components/VendorCategoryGrid';
import { findVendorCategory } from '@/lib/vendorCategories';
import './category-page.css';

type Vendor = {
  id: string;
  business_name: string;
  category_name?: string;
  city?: string;
  rating?: number | string;
  review_count?: number;
  starting_price?: number | string;
  cover_image?: string;
};

export default function VendorCategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = String(params.slug || '');
  let category = findVendorCategory(slug);
  if (slug === 'all') {
    category = {
      id: 'all',
      slug: 'all',
      name: 'All Vendors',
      description: 'Search results for all verified vendors.',
      image: '/images/photographer.jpg',
      display_order: 0,
      aliases: []
    };
  }
  const city = searchParams.get('city') || '';
  const search = searchParams.get('search') || '';
  const lat = searchParams.get('lat') || '';
  const lng = searchParams.get('lng') || '';
  const radius = searchParams.get('radius') || '';

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!category) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('category', category.slug);
    qs.set('limit', '40');
    if (city) qs.set('city', city);
    if (search) qs.set('search', search);
    if (lat) qs.set('lat', lat);
    if (lng) qs.set('lng', lng);
    if (radius) qs.set('radius', radius);
    fetch(`/api/vendors?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setVendors(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  }, [category?.slug, city, search, lat, lng, radius]);

  if (!category) {
    return (
      <div className="vcat-page">
        <Navbar onOpenLogin={() => setAuthOpen(true)} onOpenRegister={() => setAuthOpen(true)} />
        <div className="vcat-body">
          <div className="vcat-empty">
            <h2>Category not found</h2>
            <p>
              <Link href="/vendors">Back to all vendors</Link>
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="vcat-page">
      <Navbar onOpenLogin={() => setAuthOpen(true)} onOpenRegister={() => setAuthOpen(true)} />
      {slug === 'all' ? (
        <div style={{ padding: '80px 5% 0px' }}>
          <Link href="/vendors" className="vcat-back" style={{ color: '#333', fontSize: 14 }}>
            ← Back to Search
          </Link>
          <h1 style={{ marginTop: 12, fontSize: 32 }}>Nearby Vendors</h1>
        </div>
      ) : (
        <section className="vcat-hero">
          <img src={category.image} alt={category.name} />
          <div className="vcat-hero-shade" />
          <div className="vcat-hero-inner">
            <Link href="/vendors" className="vcat-back">
              ← All vendors
            </Link>
            <h1>{category.name}</h1>
            <p>{category.description}</p>
          </div>
        </section>
      )}

      <div className="vcat-body">
        <p className="vcat-count">
          {loading ? 'Loading vendors…' : `${vendors.length} vendor${vendors.length === 1 ? '' : 's'} in this category`}
        </p>

        {loading ? (
          <p>Curating vendors for {category.name}…</p>
        ) : vendors.length === 0 ? (
          <div className="vcat-empty">
            <h3>No vendors in {category.name} yet</h3>
            <p>
              Check another category from the <Link href="/vendors">category list</Link>.
            </p>
          </div>
        ) : (
          <div className="vcat-grid">
            {vendors.map((vendor) => (
              <Link key={vendor.id} href={`/vendors/${vendor.id}`} className="vcat-card">
                <img
                  src={vendor.cover_image || category.image}
                  alt={vendor.business_name}
                />
                <div className="vcat-card-body">
                  <h3>{vendor.business_name}</h3>
                  <p>
                    {[vendor.city, vendor.category_name || category.name].filter(Boolean).join(' · ')}
                    {vendor.starting_price
                      ? ` · from ₹${Number(vendor.starting_price).toLocaleString('en-IN')}`
                      : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {slug !== 'all' && (
          <>
            <h2 style={{ margin: '40px 0 16px', fontSize: 22 }}>Other categories</h2>
            <VendorCategoryGrid />
          </>
        )}
      </div>

      <Footer />
      {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
