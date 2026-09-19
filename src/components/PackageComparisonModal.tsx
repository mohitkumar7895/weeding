'use client';

import React, { useState, useEffect } from 'react';

export interface PackageAddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  service_id?: string | null;
  package_id?: string | null;
  is_active: boolean;
}

export interface ComparedPackage {
  id: string;
  name: string;
  package_tier: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'CUSTOM';
  service_id?: string | null;
  service_title?: string;
  category_name?: string;
  price: number;
  guest_capacity: number;
  description: string;
  included_items: string[];
  features: Record<string, boolean>;
  add_ons: PackageAddOn[];
  moderation_status?: string;
  is_active?: boolean;
}

export interface ComparisonData {
  vendor: {
    id: string;
    business_name: string;
    city: string;
    rating: number;
    review_count: number;
    category_name?: string;
    starting_price: number;
  };
  service?: {
    id: string;
    title: string;
    category_name?: string;
    starting_price: number;
  } | null;
  packages: ComparedPackage[];
  all_features: string[];
  available_add_ons: PackageAddOn[];
}

interface PackageComparisonModalProps {
  isOpen: boolean;
  vendorId: string;
  serviceId?: string;
  previewMode?: boolean;
  initialPackageId?: string;
  onClose: () => void;
  onSelectPackage?: (pkg: ComparedPackage, selectedAddOns: PackageAddOn[]) => void;
}

export default function PackageComparisonModal({
  isOpen,
  vendorId,
  serviceId,
  previewMode = false,
  initialPackageId,
  onClose,
  onSelectPackage,
}: PackageComparisonModalProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !vendorId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchComparison = async () => {
      try {
        let url = `/api/packages/compare?vendor_id=${encodeURIComponent(vendorId)}`;
        if (serviceId) {
          url += `&service_id=${encodeURIComponent(serviceId)}`;
        }
        if (previewMode) {
          url += `&preview=true`;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (!isMounted) return;

        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load package comparison');
        }

        setData(json.data);

        // Pre-select package
        if (json.data.packages && json.data.packages.length > 0) {
          if (initialPackageId && json.data.packages.some((p: ComparedPackage) => p.id === initialPackageId)) {
            setSelectedPkgId(initialPackageId);
          } else {
            // Default to STANDARD tier if available, otherwise first package
            const standard = json.data.packages.find((p: ComparedPackage) => p.package_tier === 'STANDARD');
            setSelectedPkgId(standard ? standard.id : json.data.packages[0].id);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to load packages for comparison.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchComparison();

    return () => {
      isMounted = false;
    };
  }, [isOpen, vendorId, serviceId, previewMode, initialPackageId]);

  if (!isOpen) return null;

  const currentPkg = data?.packages.find((p) => p.id === selectedPkgId);

  const toggleAddOn = (addonId: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const selectedAddOns = (data?.available_add_ons || []).filter((a) =>
    selectedAddOnIds.includes(a.id)
  );

  const basePrice = currentPkg ? currentPkg.price : 0;
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = basePrice + addOnsTotal;

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'BASIC':
        return {
          label: 'Essential Tier',
          bg: 'rgba(160, 174, 192, 0.15)',
          color: '#e2e8f0',
          border: 'rgba(160, 174, 192, 0.4)',
        };
      case 'STANDARD':
        return {
          label: 'Most Popular ★',
          bg: 'rgba(229, 193, 88, 0.2)',
          color: '#e5c158',
          border: 'rgba(229, 193, 88, 0.5)',
        };
      case 'PREMIUM':
        return {
          label: 'Luxury Experience 👑',
          bg: 'linear-gradient(135deg, rgba(255, 42, 115, 0.25) 0%, rgba(230, 0, 92, 0.25) 100%)',
          color: '#ff80ab',
          border: 'rgba(255, 42, 115, 0.5)',
        };
      default:
        return {
          label: 'Custom Tier',
          bg: 'rgba(72, 187, 120, 0.15)',
          color: '#48bb78',
          border: 'rgba(72, 187, 120, 0.4)',
        };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(3, 23, 16, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #051e15 0%, #03140e 100%)',
          border: '1px solid rgba(229, 193, 88, 0.35)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '1180px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 30px rgba(229, 193, 88, 0.15)',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '22px 28px',
            borderBottom: '1px solid rgba(229, 193, 88, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(4, 25, 18, 0.6)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '20px' }}>⚖️</span>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                Package Comparison & Inclusions
              </h2>
              {data?.vendor && (
                <span
                  style={{
                    background: 'rgba(229, 193, 88, 0.15)',
                    color: '#e5c158',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid rgba(229, 193, 88, 0.3)',
                  }}
                >
                  🏢 {data.vendor.business_name}
                </span>
              )}
              {data?.service && (
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e0',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                >
                  🛎️ {data.service.title}
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#a0aec0', marginTop: '6px', marginBottom: 0 }}>
              Compare real features, guest capacities, and pricing side-by-side. Add optional enhancements to customize your package.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e0',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div
                style={{
                  display: 'inline-block',
                  width: '42px',
                  height: '42px',
                  border: '3px solid rgba(229,193,88,0.2)',
                  borderTopColor: '#e5c158',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ color: '#e5c158', marginTop: '16px', fontSize: '14px', fontWeight: 600 }}>
                Loading live package configurations & inclusions...
              </p>
            </div>
          ) : error ? (
            <div
              style={{
                background: 'rgba(245, 101, 101, 0.12)',
                border: '1px solid #f56565',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                color: '#feb2b2',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
              <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{error}</p>
            </div>
          ) : !data || data.packages.length === 0 ? (
            <div
              style={{
                background: '#061d15',
                border: '1px dashed rgba(229, 193, 88, 0.3)',
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>📦</div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
                No Published Packages Available for Comparison
              </h3>
              <p style={{ fontSize: '14px', color: '#a0aec0', maxWidth: '480px', margin: '0 auto' }}>
                This vendor currently has no approved or active wedding packages configured for public comparison.
              </p>
            </div>
          ) : (
            <div>
              {/* Packages Side-by-Side Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${data.packages.length}, minmax(260px, 1fr))`,
                  gap: '20px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  marginBottom: '28px',
                }}
              >
                {data.packages.map((pkg) => {
                  const isSelected = selectedPkgId === pkg.id;
                  const tierStyle = getTierBadge(pkg.package_tier);

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPkgId(pkg.id)}
                      style={{
                        background: isSelected
                          ? 'linear-gradient(180deg, #093324 0%, #062218 100%)'
                          : '#061e16',
                        border: isSelected
                          ? '2px solid #e5c158'
                          : '1px solid rgba(229, 193, 88, 0.22)',
                        borderRadius: '16px',
                        padding: '22px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        boxShadow: isSelected
                          ? '0 8px 28px rgba(229, 193, 88, 0.22)'
                          : 'none',
                        position: 'relative',
                      }}
                    >
                      {/* Selection Ribbon */}
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '20px',
                            background: 'linear-gradient(135deg, #e5c158 0%, #d4af37 100%)',
                            color: '#031710',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 10px',
                            borderRadius: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          }}
                        >
                          Selected
                        </div>
                      )}

                      <div>
                        {/* Tier Badge */}
                        <div style={{ marginBottom: '10px' }}>
                          <span
                            style={{
                              background: tierStyle.bg,
                              color: tierStyle.color,
                              border: `1px solid ${tierStyle.border}`,
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                            }}
                          >
                            {tierStyle.label}
                          </span>
                        </div>

                        {/* Package Name */}
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '0 0 6px 0' }}>
                          {pkg.name}
                        </h3>

                        {/* Price */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '12px 0 6px 0' }}>
                          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#e5c158' }}>
                            ₹{pkg.price.toLocaleString('en-IN')}
                          </span>
                          <span style={{ fontSize: '12px', color: '#a0aec0' }}>total</span>
                        </div>

                        {/* Guest Capacity */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#cbd5e0',
                            marginBottom: '12px',
                          }}
                        >
                          <span>👥</span> Up to {pkg.guest_capacity} Guests
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: '13px', color: '#a0aec0', lineHeight: '1.5', minHeight: '38px', marginBottom: '14px' }}>
                          {pkg.description || 'Full comprehensive wedding package fulfillment.'}
                        </p>
                      </div>

                      {/* Select Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPkgId(pkg.id);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: isSelected
                            ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)'
                            : 'rgba(229, 193, 88, 0.12)',
                          color: isSelected ? '#fff' : '#e5c158',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 4px 14px rgba(230, 0, 92, 0.38)' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {isSelected ? '✓ Selected Tier' : 'Choose This Tier'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Feature Matrix Table */}
              {data.all_features && data.all_features.length > 0 && (
                <div
                  style={{
                    background: '#061d15',
                    border: '1px solid rgba(229, 193, 88, 0.2)',
                    borderRadius: '16px',
                    padding: '22px',
                    marginBottom: '28px',
                  }}
                >
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e5c158', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📋</span> Detailed Inclusions & Feature Matrix
                  </h4>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(229, 193, 88, 0.25)', color: '#cbd5e0' }}>
                          <th style={{ padding: '12px 14px', width: '38%' }}>Feature / Inclusions</th>
                          {data.packages.map((pkg) => (
                            <th
                              key={pkg.id}
                              style={{
                                padding: '12px 14px',
                                textAlign: 'center',
                                color: selectedPkgId === pkg.id ? '#e5c158' : '#cbd5e0',
                                background: selectedPkgId === pkg.id ? 'rgba(229, 193, 88, 0.08)' : 'transparent',
                                borderRadius: '8px 8px 0 0',
                              }}
                            >
                              <div style={{ fontWeight: 'bold' }}>{pkg.name}</div>
                              <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>
                                ₹{pkg.price.toLocaleString('en-IN')}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.all_features.map((feat, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '12px 14px', color: '#e2e8f0', fontWeight: 500 }}>
                              {feat}
                            </td>
                            {data.packages.map((pkg) => {
                              const hasFeature = pkg.features[feat];
                              const isColSelected = selectedPkgId === pkg.id;

                              return (
                                <td
                                  key={pkg.id}
                                  style={{
                                    padding: '12px 14px',
                                    textAlign: 'center',
                                    background: isColSelected ? 'rgba(229, 193, 88, 0.05)' : 'transparent',
                                  }}
                                >
                                  {hasFeature ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'rgba(72, 187, 120, 0.2)',
                                        color: '#48bb78',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                      }}
                                    >
                                      ✓
                                    </span>
                                  ) : (
                                    <span style={{ color: '#4a5568', fontSize: '18px' }}>—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Optional Add-ons Section */}
              {data.available_add_ons && data.available_add_ons.length > 0 && (
                <div
                  style={{
                    background: '#061d15',
                    border: '1px solid rgba(229, 193, 88, 0.2)',
                    borderRadius: '16px',
                    padding: '22px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e5c158', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✨</span> Optional Add-ons & Enhancements
                      </h4>
                      <p style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px', marginBottom: 0 }}>
                        Select extra services to tailor the package to your wedding specifications.
                      </p>
                    </div>
                    {selectedAddOnIds.length > 0 && (
                      <span
                        style={{
                          background: 'rgba(229, 193, 88, 0.15)',
                          color: '#e5c158',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {selectedAddOnIds.length} Add-on{selectedAddOnIds.length > 1 ? 's' : ''} Selected (+₹{addOnsTotal.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {data.available_add_ons.map((addon) => {
                      const isChecked = selectedAddOnIds.includes(addon.id);

                      return (
                        <div
                          key={addon.id}
                          onClick={() => toggleAddOn(addon.id)}
                          style={{
                            background: isChecked ? 'rgba(229, 193, 88, 0.08)' : '#07241a',
                            border: isChecked
                              ? '1px solid #e5c158'
                              : '1px solid rgba(229, 193, 88, 0.18)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{
                              accentColor: '#ff2a73',
                              width: '18px',
                              height: '18px',
                              marginTop: '2px',
                              cursor: 'pointer',
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>
                                {addon.name}
                              </div>
                              <div style={{ fontWeight: 'bold', color: '#e5c158', fontSize: '13px' }}>
                                +₹{addon.price.toLocaleString('en-IN')}
                              </div>
                            </div>
                            {addon.description && (
                              <p style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px', marginBottom: 0 }}>
                                {addon.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Sticky Action Bar */}
        {data && data.packages.length > 0 && (
          <div
            style={{
              padding: '18px 28px',
              borderTop: '1px solid rgba(229, 193, 88, 0.2)',
              background: 'rgba(4, 25, 18, 0.95)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                Selected: <span style={{ color: '#fff', fontWeight: 600 }}>{currentPkg?.name}</span>
                {selectedAddOns.length > 0 && (
                  <span> + {selectedAddOns.length} Add-on{selectedAddOns.length > 1 ? 's' : ''}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#e5c158' }}>
                  ₹{totalPrice.toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '12px', color: '#a0aec0' }}>total estimate</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#cbd5e0',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Close Comparison
              </button>

              {onSelectPackage && currentPkg && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectPackage(currentPkg, selectedAddOns);
                    onClose();
                  }}
                  style={{
                    padding: '11px 26px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(230, 0, 92, 0.38)',
                  }}
                >
                  Proceed with {currentPkg.name} →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
