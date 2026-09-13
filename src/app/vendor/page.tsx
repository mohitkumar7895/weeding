'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VendorDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'services' | 'onboarding' | 'packages' | 'calendar' | 'bookings' | 'portfolio'>('overview');
  const [vendorData, setVendorData] = useState<any>(null);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Business Profile Form States
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [profBusinessName, setProfBusinessName] = useState('');
  const [profCategoryId, setProfCategoryId] = useState('');
  const [profAdditionalCategoryIds, setProfAdditionalCategoryIds] = useState<string[]>([]);
  const [profDescription, setProfDescription] = useState('');
  const [profStartingPrice, setProfStartingPrice] = useState('15000');
  const [profExperienceYears, setProfExperienceYears] = useState('1');
  const [profYearEstablished, setProfYearEstablished] = useState('');
  const [profCountry, setProfCountry] = useState('India');
  const [profState, setProfState] = useState('');
  const [profCity, setProfCity] = useState('');
  const [profPincode, setProfPincode] = useState('');
  const [profAddress, setProfAddress] = useState('');
  const [profServiceRadius, setProfServiceRadius] = useState<number>(50);
  const [profServiceAreaCities, setProfServiceAreaCities] = useState<string[]>([]);
  const [newCityTag, setNewCityTag] = useState('');
  const [profTravelsToVenue, setProfTravelsToVenue] = useState(true);
  const [profPhone, setProfPhone] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profWebsite, setProfWebsite] = useState('');
  const [profInstagram, setProfInstagram] = useState('');
  const [savingBusinessProfile, setSavingBusinessProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Dedicated Services Management States
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [srvTitle, setSrvTitle] = useState('');
  const [srvCategoryId, setSrvCategoryId] = useState('');
  const [srvStartingPrice, setSrvStartingPrice] = useState('15000');
  const [srvLocation, setSrvLocation] = useState('');
  const [srvDescription, setSrvDescription] = useState('');
  const [savingService, setSavingService] = useState(false);
  const [serviceActionErr, setServiceActionErr] = useState<string | null>(null);

  // Forms states
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgPrice, setNewPkgPrice] = useState('');
  const [newPkgDesc, setNewPkgDesc] = useState('');
  const [newPkgCapacity, setNewPkgCapacity] = useState('');
  const [newPkgInclusions, setNewPkgInclusions] = useState('');

  const [newSrvTitle, setNewSrvTitle] = useState('');
  const [newSrvPrice, setNewSrvPrice] = useState('');
  const [newSrvDesc, setNewSrvDesc] = useState('');

  const [docType, setDocType] = useState('PAN');
  const [docNumber, setDocNumber] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Bank & Profile Form states
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  const [editProfileMode, setEditProfileMode] = useState(false);
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartingPrice, setEditStartingPrice] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const [reelTitle, setReelTitle] = useState('');
  const [reelVideoUrl, setReelVideoUrl] = useState('');
  const [reelThumbUrl, setReelThumbUrl] = useState('');

  useEffect(() => {
    fetchVendorProfile();
  }, []);

  const fetchVendorProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authData.authenticated || authData.user?.role !== 'VENDOR') {
        setAuthNeeded(true);
        setLoading(false);
        return;
      }

      setAuthNeeded(false);

      // Load parallel vendor data
      await Promise.all([
        loadVendorOverview(),
        loadBusinessProfileData(),
        loadOnboardingAndDocs(),
        loadPackagesAndServices(),
        loadBookings(),
        loadAvailability(),
        loadPortfoliosAndReels(),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadVendorOverview = async () => {
    try {
      const eRes = await fetch('/api/vendor/earnings');
      const eData = await eRes.json();
      if (eData.success) {
        setEarnings(eData.data);
      }
    } catch {}
  };

  const loadBusinessProfileData = async () => {
    try {
      const [profRes, catRes] = await Promise.all([
        fetch('/api/vendor/profile'),
        fetch('/api/categories'),
      ]);
      const [profData, catData] = await Promise.all([profRes.json(), catRes.json()]);

      if (catData.success && Array.isArray(catData.data)) {
        setAllCategories(catData.data);
      }

      if (profData.success && profData.data) {
        const p = profData.data;
        setProfBusinessName(p.business_name || '');
        setProfCategoryId(p.category_id || '');
        const addCats = (p.categories || [])
          .filter((c: any) => !c.is_primary && c.id !== p.category_id)
          .map((c: any) => c.id);
        setProfAdditionalCategoryIds(addCats);
        setProfDescription(p.description || '');
        setProfStartingPrice(p.starting_price ? p.starting_price.toString() : '15000');
        setProfExperienceYears(p.experience_years ? p.experience_years.toString() : '1');
        setProfYearEstablished(p.year_established ? p.year_established.toString() : '');
        setProfCountry(p.country || 'India');
        setProfState(p.state || 'Delhi NCR');
        setProfCity(p.city || '');
        setProfPincode(p.pincode || '');
        setProfAddress(p.address || '');
        setProfServiceRadius(p.service_radius_km !== undefined && p.service_radius_km !== null ? p.service_radius_km : 50);
        setProfServiceAreaCities(Array.isArray(p.service_area_cities) ? p.service_area_cities : []);
        setProfTravelsToVenue(p.travels_to_venue !== undefined ? Boolean(p.travels_to_venue) : true);
        setProfPhone(p.business_phone || '');
        setProfEmail(p.business_email || '');
        setProfWebsite(p.website_url || '');
        setProfInstagram(p.instagram_handle || '');
      }
    } catch (err) {
      console.error('Failed to load business profile:', err);
    }
  };

  const loadOnboardingAndDocs = async () => {
    try {
      const res = await fetch('/api/vendor/onboarding');
      const data = await res.json();
      if (data.success) {
        const v = data.data.vendor;
        setVendorData(v);
        setOnboardingData(data.data.onboarding);
        setDocuments(data.data.documents || []);

        if (v) {
          setBankAccount(v.bank_account_number || '');
          setBankIfsc(v.bank_ifsc || '');
          setPanNumber(v.pan_number || '');
          setGstNumber(v.gst_number || '');

          setEditBusinessName(v.business_name || '');
          setEditCity(v.city || '');
          setEditAddress(v.address || '');
          setEditDescription(v.description || '');
          setEditStartingPrice(v.starting_price ? v.starting_price.toString() : '15000');
        }
      }
    } catch {}
  };

  const loadPackagesAndServices = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/vendor/packages'),
        fetch('/api/vendor/services'),
      ]);
      const [pData, sData] = await Promise.all([pRes.json(), sRes.json()]);
      if (pData.success && Array.isArray(pData.data)) setPackages(pData.data);
      if (sData.success && Array.isArray(sData.data)) setServices(sData.data);
    } catch (err) {
      console.error('Failed to load packages and services:', err);
    }
  };

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success) setBookings(data.data);
    } catch {}
  };

  const loadAvailability = async () => {
    try {
      const res = await fetch('/api/vendor/availability');
      const data = await res.json();
      if (data.success) setAvailability(data.data);
    } catch {}
  };

  const loadPortfoliosAndReels = async () => {
    try {
      const [pfRes, rlRes] = await Promise.all([
        fetch('/api/vendor/portfolio'),
        fetch('/api/vendor/reels'),
      ]);
      const [pfData, rlData] = await pfRes.json();
      if (pfData.success) setPortfolios(pfData.data);
      if (rlData.success) setReels(rlData.data);
    } catch {}
  };

  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthNeeded(false);
        fetchVendorProfile();
      } else {
        setError(data.message || 'Vendor login failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Booking successfully updated to ${status}`);
        loadBookings();
        loadVendorOverview();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName || !newPkgPrice) return;
    try {
      const res = await fetch('/api/vendor/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPkgName,
          price: parseFloat(newPkgPrice),
          description: newPkgDesc,
          guest_capacity: parseInt(newPkgCapacity, 10),
          included_items: newPkgInclusions.split(',').map((s) => s.trim()),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Package created and submitted for admin review!');
        setNewPkgName('');
        setNewPkgPrice('');
        setNewPkgDesc('');
        loadPackagesAndServices();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to remove this package?')) return;
    try {
      const res = await fetch(`/api/vendor/packages?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Package deleted successfully');
        loadPackagesAndServices();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenAddService = () => {
    setEditingService(null);
    setSrvTitle('');
    setSrvCategoryId(profCategoryId || (allCategories.length > 0 ? allCategories[0].id : ''));
    setSrvStartingPrice('15000');
    setSrvLocation(profCity || vendorData?.city || '');
    setSrvDescription('');
    setServiceActionErr(null);
    setShowServiceModal(true);
  };

  const handleOpenEditService = (srv: any) => {
    setEditingService(srv);
    setSrvTitle(srv.title || '');
    setSrvCategoryId(srv.category_id || profCategoryId || (allCategories.length > 0 ? allCategories[0].id : ''));
    setSrvStartingPrice(srv.starting_price !== undefined && srv.starting_price !== null ? srv.starting_price.toString() : '0');
    setSrvLocation(srv.service_location || '');
    setSrvDescription(srv.description || '');
    setServiceActionErr(null);
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvTitle.trim()) {
      setServiceActionErr('Service title is required');
      return;
    }
    const priceNum = parseFloat(srvStartingPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setServiceActionErr('Starting price must be a valid positive number');
      return;
    }

    setSavingService(true);
    setServiceActionErr(null);
    try {
      if (editingService) {
        // PUT update
        const res = await fetch('/api/vendor/services', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingService.id,
            title: srvTitle.trim(),
            category_id: srvCategoryId || null,
            starting_price: priceNum,
            service_location: srvLocation.trim() || null,
            description: srvDescription.trim() || null,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Service "${srvTitle.trim()}" updated and re-submitted for moderation review.`);
          setShowServiceModal(false);
          loadPackagesAndServices();
        } else {
          setServiceActionErr(data.message || 'Failed to update service');
        }
      } else {
        // POST create
        const res = await fetch('/api/vendor/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: srvTitle.trim(),
            category_id: srvCategoryId || null,
            starting_price: priceNum,
            service_location: srvLocation.trim() || null,
            description: srvDescription.trim() || null,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Service "${srvTitle.trim()}" successfully created and submitted for moderation review.`);
          setShowServiceModal(false);
          loadPackagesAndServices();
        } else {
          setServiceActionErr(data.message || 'Failed to create service');
        }
      }
    } catch (err: any) {
      setServiceActionErr(err.message || 'An unexpected error occurred while saving service');
    } finally {
      setSavingService(false);
    }
  };

  const handleToggleServiceActive = async (srv: any) => {
    try {
      const res = await fetch('/api/vendor/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: srv.id,
          is_active: !srv.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Service "${srv.title}" is now ${!srv.is_active ? 'Active' : 'Paused'}.`);
        loadPackagesAndServices();
      } else {
        setError(data.message || 'Failed to toggle service status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle service status');
    }
  };

  const handleDeleteService = async (srvId: string, srvTitle: string) => {
    if (!confirm(`Are you sure you want to delete service "${srvTitle}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/vendor/services?id=${encodeURIComponent(srvId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Service "${srvTitle}" deleted successfully.`);
        loadPackagesAndServices();
      } else {
        setError(data.message || 'Failed to delete service');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete service');
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrvTitle || !newSrvPrice) return;
    try {
      const res = await fetch('/api/vendor/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSrvTitle,
          starting_price: parseFloat(newSrvPrice),
          description: newSrvDesc,
          category_id: profCategoryId || null,
          service_location: profCity || vendorData?.city || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Service submitted for review!');
        setNewSrvTitle('');
        setNewSrvPrice('');
        setNewSrvDesc('');
        loadPackagesAndServices();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !docFileUrl) {
      setError('Please select a KYC file (PDF/JPG/PNG up to 10MB) or enter a storage URL.');
      return;
    }

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setError('Document exceeds the 10MB file size limit.');
      return;
    }

    setUploadingDoc(true);
    setError(null);
    try {
      let res: Response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('doc_type', docType);
        if (docNumber) formData.append('document_number', docNumber);

        res = await fetch('/api/vendor/documents', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/vendor/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc_type: docType,
            document_number: docNumber,
            file_url: docFileUrl,
          }),
        });
      }

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Document (${docType}) successfully uploaded for compliance verification.`);
        setDocNumber('');
        setDocFileUrl('');
        setSelectedFile(null);
        loadOnboardingAndDocs();
      } else {
        setError(data.message || 'Failed to upload document.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccount || !bankIfsc) {
      setError('Both Bank Account Number and IFSC code are required for settlements.');
      return;
    }
    setSavingBank(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_account_number: bankAccount.trim(),
          bank_ifsc: bankIfsc.trim().toUpperCase(),
          pan_number: panNumber ? panNumber.trim().toUpperCase() : undefined,
          gst_number: gstNumber ? gstNumber.trim().toUpperCase() : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Bank account and payout details saved successfully.');
        loadOnboardingAndDocs();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingBank(false);
    }
  };

  const handleSaveBusinessProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: editBusinessName.trim(),
          city: editCity.trim(),
          address: editAddress.trim(),
          description: editDescription.trim(),
          starting_price: parseFloat(editStartingPrice) || 15000,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Business profile updated successfully.');
        setEditProfileMode(false);
        loadOnboardingAndDocs();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveFullBusinessProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBusinessProfile(true);
    setProfileMsg(null);
    setProfileErr(null);

    if (!profBusinessName.trim()) {
      setProfileErr('Business name is required.');
      setSavingBusinessProfile(false);
      return;
    }
    if (!profCity.trim()) {
      setProfileErr('Business city is required.');
      setSavingBusinessProfile(false);
      return;
    }

    try {
      const res = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: profBusinessName.trim(),
          category_id: profCategoryId || undefined,
          additional_category_ids: profAdditionalCategoryIds,
          description: profDescription.trim(),
          starting_price: parseFloat(profStartingPrice) || 15000,
          experience_years: parseInt(profExperienceYears, 10) || 1,
          year_established: profYearEstablished ? parseInt(profYearEstablished, 10) : null,
          country: profCountry.trim(),
          state: profState.trim(),
          city: profCity.trim(),
          pincode: profPincode.trim(),
          address: profAddress.trim(),
          service_radius_km: profServiceRadius,
          service_area_cities: profServiceAreaCities,
          travels_to_venue: profTravelsToVenue,
          business_phone: profPhone.trim(),
          business_email: profEmail.trim(),
          website_url: profWebsite.trim(),
          instagram_handle: profInstagram.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProfileMsg('Business profile saved and synchronized successfully!');
        await Promise.all([loadBusinessProfileData(), loadOnboardingAndDocs()]);
        setTimeout(() => setProfileMsg(null), 5000);
      } else {
        setProfileErr(data.message || 'Failed to update business profile');
      }
    } catch (err: any) {
      setProfileErr(err.message || 'Error communicating with server');
    } finally {
      setSavingBusinessProfile(false);
    }
  };

  const handleAddCityTag = () => {
    const trimmed = newCityTag.trim();
    if (!trimmed) return;
    if (!profServiceAreaCities.includes(trimmed)) {
      setProfServiceAreaCities([...profServiceAreaCities, trimmed]);
    }
    setNewCityTag('');
  };

  const handleRemoveCityTag = (cityToRemove: string) => {
    setProfServiceAreaCities(profServiceAreaCities.filter((c) => c !== cityToRemove));
  };

  const handleToggleAdditionalCategory = (catId: string) => {
    if (catId === profCategoryId) return; // Cannot toggle primary category as secondary
    if (profAdditionalCategoryIds.includes(catId)) {
      setProfAdditionalCategoryIds(profAdditionalCategoryIds.filter((id) => id !== catId));
    } else {
      setProfAdditionalCategoryIds([...profAdditionalCategoryIds, catId]);
    }
  };

  const handleSubmitOnboarding = async () => {
    try {
      const res = await fetch('/api/vendor/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submit_for_review: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Onboarding dossier submitted for compliance review! Verified badge will activate upon approval.');
        loadOnboardingAndDocs();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;
    try {
      const res = await fetch('/api/vendor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: blockDate,
          is_booked: true,
          notes: blockReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Date ${blockDate} marked as unavailable`);
        setBlockDate('');
        loadAvailability();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUploadReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelTitle || !reelVideoUrl) return;
    try {
      const res = await fetch('/api/vendor/reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reelTitle,
          video_url: reelVideoUrl,
          thumbnail_url: reelThumbUrl || '/images/photographer.jpg',
          description: 'Verified wedding highlight showcase',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Reel uploaded and submitted for review!');
        setReelTitle('');
        setReelVideoUrl('');
        loadPortfoliosAndReels();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (authNeeded) {
    return (
      <div style={{ minHeight: '100vh', background: '#03140e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: 'linear-gradient(180deg, #062a1c 0%, #031710 100%)', border: '1.5px solid rgba(229,193,88,0.35)', borderRadius: '24px', padding: '36px', boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(255,42,115,0.15)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <svg width="48" height="34" viewBox="0 0 54 40" fill="none">
                <defs>
                  <linearGradient id="vendorPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff2a73" />
                    <stop offset="100%" stopColor="#e6005c" />
                  </linearGradient>
                  <linearGradient id="vendorHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff528c" />
                    <stop offset="100%" stopColor="#d8004f" />
                  </linearGradient>
                </defs>
                <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#vendorPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#vendorHeartGrad)" />
                <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#vendorPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ color: '#e5c158', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>WedWithMe</span>
            <h2 style={{ fontSize: '20px', marginTop: '8px', color: '#fff' }}>Vendor Partner Suite</h2>
            <p style={{ fontSize: '13px', color: '#9cb1a6' }}>Log in to manage bookings, packages, calendar availability, and payouts</p>
          </div>
          {error && <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #e6005c', color: '#ffb3c6', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
          <form onSubmit={handleVendorLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', marginBottom: '6px' }}>VENDOR ACCOUNT EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', marginBottom: '6px' }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Vendor Suite'}
            </button>
          </form>
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#a0aec0' }}>
            New wedding service provider? <Link href="/vendor/register" style={{ color: '#ff6b9d', fontWeight: 'bold' }}>Register as Vendor Partner</Link>
          </div>
        </div>
      </div>
    );
  }

  const onboardingStatus = onboardingData?.status || 'DRAFT';
  const isApproved = onboardingStatus === 'APPROVED';

  return (
    <div style={{ minHeight: '100vh', background: '#06140e', color: '#fff', display: 'flex' }}>
      {/* Left Sidebar Navigation */}
      <aside
        style={{
          width: '280px',
          flexShrink: 0,
          background: '#031710',
          borderRight: '1px solid rgba(229,193,88,0.2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          padding: '24px 16px',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div style={{ paddingBottom: '18px', borderBottom: '1px solid rgba(229,193,88,0.15)', marginBottom: '18px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="30" height="22" viewBox="0 0 54 40" fill="none">
              <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#vendorPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#vendorHeartGrad)" />
              <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#vendorPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#e5c158', letterSpacing: '-0.5px' }}>WedWithMe</span>
          </Link>
          <div style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', background: 'rgba(229,193,88,0.12)', color: '#e5c158', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(229,193,88,0.25)', fontWeight: 600 }}>
            Vendor Partner Suite
          </div>
        </div>

        {/* Vendor Profile Card */}
        <div style={{ background: '#072218', border: '1px solid rgba(229,193,88,0.18)', borderRadius: '12px', padding: '14px', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #ff2a73, #e6005c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#fff', boxShadow: '0 3px 10px rgba(230,0,92,0.35)' }}>
              {vendorData?.business_name ? vendorData.business_name.charAt(0).toUpperCase() : 'V'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {vendorData?.business_name || 'Vendor Partner'}
              </div>
              <div style={{ fontSize: '11px', color: '#a0aec0' }}>
                {vendorData?.city || 'India'} • ★ {vendorData?.rating || '4.9'}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 'bold',
              background: isApproved ? 'rgba(56,161,105,0.2)' : 'rgba(237,137,54,0.2)',
              color: isApproved ? '#48bb78' : '#ed8936',
              border: `1px solid ${isApproved ? '#48bb78' : '#ed8936'}`,
            }}>
              KYC: {onboardingStatus}
            </span>
            <span style={{ fontSize: '11px', color: '#e5c158' }}>
              {packages.length} Packages
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#e5c158', letterSpacing: '0.8px', padding: '0 8px', marginBottom: '4px' }}>
            VENDOR NAVIGATION
          </div>
          {[
            { id: 'overview', label: 'Earnings & Overview', icon: '📊' },
            { id: 'profile', label: 'Business Profile', icon: '🏢' },
            { id: 'services', label: 'Wedding Services', icon: '🛎️', count: services.length },
            { id: 'onboarding', label: 'Onboarding & KYC', icon: '🛡️', badge: onboardingStatus !== 'APPROVED' ? 'ACTION' : 'DONE' },
            { id: 'packages', label: 'Packages (Tiers)', icon: '📦', count: packages.length },
            { id: 'calendar', label: 'Availability Calendar', icon: '📅' },
            { id: 'bookings', label: 'Bookings & Leads', icon: '💌', count: bookings.length },
            { id: 'portfolio', label: 'Portfolio & Reels', icon: '📸', count: reels.length },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e0',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 4px 14px rgba(230, 0, 92, 0.38)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  {item.label}
                </span>
                {item.count !== undefined && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(229,193,88,0.15)',
                    color: isActive ? '#fff' : '#e5c158',
                    fontWeight: 700,
                  }}>
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : item.badge === 'ACTION' ? 'rgba(237,137,54,0.25)' : 'rgba(56,161,105,0.25)',
                    color: isActive ? '#fff' : item.badge === 'ACTION' ? '#ed8936' : '#48bb78',
                    fontWeight: 700,
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Sign Out Button */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(229,193,88,0.15)' }}>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              setAuthNeeded(true);
            }}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '70px',
            background: '#031710',
            borderBottom: '1px solid rgba(229,193,88,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 5,
          }}
        >
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
              {activeTab === 'overview' && 'Earnings & Financial Performance'}
              {activeTab === 'profile' && 'Vendor Business Profile & Service Coverage'}
              {activeTab === 'services' && 'Wedding Services & Standalone Offerings'}
              {activeTab === 'onboarding' && 'KYC Verification & Compliance Dossier'}
              {activeTab === 'packages' && 'Wedding Packages & Tiered Bundles'}
              {activeTab === 'calendar' && 'Availability & Slot Management'}
              {activeTab === 'bookings' && 'Client Inquiries & Order Fulfillment'}
              {activeTab === 'portfolio' && 'High-Definition Portfolio & Reels'}
            </div>
            <div style={{ fontSize: '12px', color: '#a0aec0' }}>
              Partner: {vendorData?.business_name || 'Vendor Partner'} • Status: {onboardingStatus}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link
              href="/vendors"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
              }}
            >
              View Live Storefront ↗
            </Link>
          </div>
        </header>

        {/* Main Vendor Content */}
        <main style={{ flex: 1, padding: '32px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          {error && (
            <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #e6005c', color: '#ffb3c6', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
              ⚠️ {error}
            </div>
          )}
          {successMsg && (
            <div style={{ background: 'rgba(56,161,105,0.15)', border: '1px solid #38a169', color: '#9ae6b4', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
              ✓ {successMsg}
            </div>
          )}

          {/* ================= TAB 1: OVERVIEW & EARNINGS ================= */}
          {activeTab === 'overview' && (
            <div>
              {/* Vendor Header Card */}
              <div style={{ background: '#061d15', border: '1px solid rgba(229,193,88,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff' }}>{vendorData?.business_name || 'Vendor Partner'}</h1>
                    {vendorData?.verification_status === 'VERIFIED' ? (
                      <span style={{ background: 'rgba(56,161,105,0.2)', color: '#48bb78', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #48bb78', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ✓ VERIFIED PARTNER
                      </span>
                    ) : vendorData?.verification_status === 'REJECTED' ? (
                      <span style={{ background: 'rgba(230,0,92,0.2)', color: '#ff6b9d', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #ff6b9d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ✕ VERIFICATION REJECTED
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(237,137,54,0.2)', color: '#ed8936', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #ed8936', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ⏳ VERIFICATION PENDING
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#a0aec0', fontSize: '14px', marginTop: '6px' }}>
                    {vendorData?.city} • Starting from ₹{parseFloat(vendorData?.starting_price || 15000).toLocaleString('en-IN')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e5c158' }}>★ {vendorData?.rating || '4.9'}</div>
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>{vendorData?.review_count || 0} verified customer reviews</div>
                </div>
              </div>

              {/* Financial KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: '#072218', padding: '20px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Gross Bookings Volume</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff', marginTop: '6px' }}>
                    ₹{parseFloat(earnings?.gross_revenue || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Total client order value</div>
                </div>

                <div style={{ background: '#072218', padding: '20px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Platform Commission (10%)</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#ed8936', marginTop: '6px' }}>
                    ₹{parseFloat(earnings?.total_commission || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Calculated by Commission Engine</div>
                </div>

                <div style={{ background: '#072218', padding: '20px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Net Vendor Payable</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#38a169', marginTop: '6px' }}>
                    ₹{parseFloat(earnings?.net_vendor_earnings || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#48bb78', marginTop: '4px' }}>Net of platform commission</div>
                </div>

                <div style={{ background: '#072218', padding: '20px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Paid Out Settlements</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#e5c158', marginTop: '6px' }}>
                    ₹{parseFloat(earnings?.paid_payouts || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Pending: ₹{parseFloat(earnings?.pending_payouts || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Payout Settlements Ledger */}
              <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Settlement & Payout History</h2>
                {earnings?.recent_payouts?.length === 0 ? (
                  <p style={{ color: '#a0aec0', fontSize: '14px' }}>No completed settlements yet. Payouts trigger automatically upon event completion.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#0a271c', color: '#e5c158', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Payout Ref</th>
                        <th style={{ padding: '12px' }}>Booking #</th>
                        <th style={{ padding: '12px' }}>Net Amount</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Generated Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings?.recent_payouts?.map((p: any) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', color: '#e5c158' }}>{p.reference_id}</td>
                          <td style={{ padding: '12px' }}>{p.booking_number}</td>
                          <td style={{ padding: '12px', color: '#48bb78', fontWeight: 'bold' }}>₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                              background: p.status === 'PAID' ? 'rgba(56,161,105,0.2)' : 'rgba(237,137,54,0.2)',
                              color: p.status === 'PAID' ? '#48bb78' : '#ed8936'
                            }}>{p.status}</span>
                          </td>
                          <td style={{ padding: '12px', color: '#a0aec0' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Business Profile Shortcut Banner */}
              <div style={{
                background: '#061d15',
                border: '1px solid rgba(229,193,88,0.25)',
                borderRadius: '16px',
                padding: '20px 24px',
                marginTop: '28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🏢</span>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                      Wedding Business Profile & Coverage
                    </h3>
                  </div>
                  <p style={{ fontSize: '13px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                    Category: <strong>{profCategoryId ? (allCategories.find(c => c.id === profCategoryId)?.name || vendorData?.category_name) : (vendorData?.category_name || 'Wedding Partner')}</strong> • City: <strong>{profCity || vendorData?.city}</strong> • Coverage Radius: <strong>{profServiceRadius} km</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  style={{
                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(230,0,92,0.3)',
                  }}
                >
                  Manage Business Profile →
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB: BUSINESS PROFILE ================= */}
          {activeTab === 'profile' && (
            <div>
              {/* Profile Top Verification & Status Bar */}
              <div style={{
                background: '#061d15',
                border: '1px solid rgba(229,193,88,0.25)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                      {profBusinessName || vendorData?.business_name || 'Business Profile'}
                    </h1>
                    {vendorData?.verification_status === 'VERIFIED' ? (
                      <span style={{
                        background: 'rgba(56,161,105,0.2)',
                        color: '#48bb78',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        border: '1px solid #48bb78',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        ✓ VERIFIED PARTNER
                      </span>
                    ) : vendorData?.verification_status === 'REJECTED' ? (
                      <span style={{
                        background: 'rgba(230,0,92,0.2)',
                        color: '#ff6b9d',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        border: '1px solid #ff6b9d',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        ✕ VERIFICATION REJECTED
                      </span>
                    ) : (
                      <span style={{
                        background: 'rgba(237,137,54,0.2)',
                        color: '#ed8936',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        border: '1px solid #ed8936',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        ⏳ VERIFICATION PENDING
                      </span>
                    )}

                    <span style={{
                      background: 'rgba(229,193,88,0.15)',
                      color: '#e5c158',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: '1px solid rgba(229,193,88,0.3)',
                    }}>
                      Profile: {vendorData?.profile_status || 'APPROVED'}
                    </span>
                  </div>

                  <p style={{ color: '#a0aec0', fontSize: '13px', margin: '8px 0 0 0' }}>
                    {vendorData?.verification_status === 'VERIFIED' ? (
                      <span style={{ color: '#68d391' }}>● Live Storefront Active: Visible to couples searching in {profCity || vendorData?.city}</span>
                    ) : (
                      <span style={{ color: '#f6ad55' }}>○ Public Storefront Inactive: Profile becomes discoverable once KYC documents are approved.</span>
                    )}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('onboarding')}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(229,193,88,0.4)',
                      color: '#e5c158',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    View KYC Status →
                  </button>
                </div>
              </div>

              {/* Feedback Alerts */}
              {profileMsg && (
                <div style={{
                  background: 'rgba(56,161,105,0.18)',
                  border: '1px solid #38a169',
                  borderRadius: '12px',
                  padding: '14px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#48bb78',
                  fontSize: '14px',
                  fontWeight: 600,
                }}>
                  <span>✓</span> {profileMsg}
                </div>
              )}

              {profileErr && (
                <div style={{
                  background: 'rgba(230,0,92,0.18)',
                  border: '1px solid #e6005c',
                  borderRadius: '12px',
                  padding: '14px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#ff6b9d',
                  fontSize: '14px',
                  fontWeight: 600,
                }}>
                  <span>✕</span> {profileErr}
                </div>
              )}

              {/* Main Business Profile Form */}
              <form onSubmit={handleSaveFullBusinessProfile}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  
                  {/* Card 1: Brand & Service Specialization */}
                  <div style={{ background: '#061d15', border: '1px solid rgba(229,193,88,0.2)', borderRadius: '16px', padding: '24px' }}>
                    <div style={{ borderBottom: '1px solid rgba(229,193,88,0.15)', paddingBottom: '12px', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>
                        1. Business Identity & Wedding Specializations
                      </h3>
                      <p style={{ fontSize: '12px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                        Your registered brand name and primary services visible to prospective clients.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          Registered Business Name *
                        </label>
                        <input
                          type="text"
                          value={profBusinessName}
                          onChange={(e) => setProfBusinessName(e.target.value)}
                          placeholder="e.g. Royal Heritage Photography"
                          required
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          Primary Wedding Category *
                        </label>
                        <select
                          value={profCategoryId}
                          onChange={(e) => setProfCategoryId(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="">Select Primary Category</option>
                          {allCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.description || c.slug})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          Starting Package Price (₹) *
                        </label>
                        <input
                          type="number"
                          value={profStartingPrice}
                          onChange={(e) => setProfStartingPrice(e.target.value)}
                          placeholder="15000"
                          min="0"
                          required
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                            Experience (Years)
                          </label>
                          <input
                            type="number"
                            value={profExperienceYears}
                            onChange={(e) => setProfExperienceYears(e.target.value)}
                            min="0"
                            placeholder="5"
                            style={{
                              width: '100%',
                              background: '#0a271c',
                              border: '1px solid rgba(229,193,88,0.3)',
                              borderRadius: '8px',
                              padding: '11px 14px',
                              color: '#fff',
                              fontSize: '14px',
                              outline: 'none',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                            Est. Year
                          </label>
                          <input
                            type="number"
                            value={profYearEstablished}
                            onChange={(e) => setProfYearEstablished(e.target.value)}
                            placeholder="2018"
                            min="1950"
                            max={new Date().getFullYear()}
                            style={{
                              width: '100%',
                              background: '#0a271c',
                              border: '1px solid rgba(229,193,88,0.3)',
                              borderRadius: '8px',
                              padding: '11px 14px',
                              color: '#fff',
                              fontSize: '14px',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Categories Multi-Select Pills */}
                    <div style={{ marginTop: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                        Secondary Service Specializations (Multi-Category Discovery)
                      </label>
                      <p style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '10px' }}>
                        Select other wedding services you provide to allow couples to discover your brand across multiple search filters:
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {allCategories.map((c) => {
                          const isPrimary = c.id === profCategoryId;
                          const isSelected = profAdditionalCategoryIds.includes(c.id);
                          return (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => handleToggleAdditionalCategory(c.id)}
                              disabled={isPrimary}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: isPrimary ? 'not-allowed' : 'pointer',
                                border: isPrimary
                                  ? '1.5px solid #e5c158'
                                  : isSelected
                                  ? '1.5px solid #ff2a73'
                                  : '1px solid rgba(229,193,88,0.25)',
                                background: isPrimary
                                  ? 'rgba(229,193,88,0.2)'
                                  : isSelected
                                  ? 'rgba(255,42,115,0.25)'
                                  : '#0a271c',
                                color: isPrimary ? '#e5c158' : isSelected ? '#fff' : '#cbd5e0',
                                transition: 'all 0.2s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>{isPrimary ? '★ Primary:' : isSelected ? '✓' : '+'}</span>
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Business Narrative & Bio */}
                  <div style={{ background: '#061d15', border: '1px solid rgba(229,193,88,0.2)', borderRadius: '16px', padding: '24px' }}>
                    <div style={{ borderBottom: '1px solid rgba(229,193,88,0.15)', paddingBottom: '12px', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>
                        2. About Business & Wedding Bio
                      </h3>
                      <p style={{ fontSize: '12px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                        Provide a compelling narrative highlighting your artistic signature, team strengths, equipment, and wedding experience.
                      </p>
                    </div>

                    <div>
                      <textarea
                        value={profDescription}
                        onChange={(e) => setProfDescription(e.target.value)}
                        rows={4}
                        placeholder="Tell couples what makes your wedding service exceptional. Mention drone coverage, destination wedding portfolio, luxury banquet setups, cuisine awards, etc."
                        style={{
                          width: '100%',
                          background: '#0a271c',
                          border: '1px solid rgba(229,193,88,0.3)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          color: '#fff',
                          fontSize: '14px',
                          outline: 'none',
                          lineHeight: '1.6',
                        }}
                      />
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#a0aec0', marginTop: '6px' }}>
                        {profDescription.length} characters
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Location, Service Area & Venue Travel */}
                  <div style={{ background: '#061d15', border: '1px solid rgba(229,193,88,0.2)', borderRadius: '16px', padding: '24px' }}>
                    <div style={{ borderBottom: '1px solid rgba(229,193,88,0.15)', paddingBottom: '12px', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>
                        3. Business Location & Service Area Coverage
                      </h3>
                      <p style={{ fontSize: '12px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                        Configure your physical studio/office base and geographical service regions for client matching.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          Country
                        </label>
                        <input
                          type="text"
                          value={profCountry}
                          onChange={(e) => setProfCountry(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          State / Region
                        </label>
                        <input
                          type="text"
                          value={profState}
                          onChange={(e) => setProfState(e.target.value)}
                          placeholder="e.g. Rajasthan"
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          Primary City *
                        </label>
                        <input
                          type="text"
                          value={profCity}
                          onChange={(e) => setProfCity(e.target.value)}
                          placeholder="e.g. Jaipur"
                          required
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          Postal Pincode
                        </label>
                        <input
                          type="text"
                          value={profPincode}
                          onChange={(e) => setProfPincode(e.target.value)}
                          placeholder="e.g. 302001"
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                        Studio / Commercial Office Address
                      </label>
                      <input
                        type="text"
                        value={profAddress}
                        onChange={(e) => setProfAddress(e.target.value)}
                        placeholder="e.g. 42 Palace Road, Near Hawa Mahal, Jaipur"
                        style={{
                          width: '100%',
                          background: '#0a271c',
                          border: '1px solid rgba(229,193,88,0.3)',
                          borderRadius: '8px',
                          padding: '11px 14px',
                          color: '#fff',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Service Radius Slider */}
                    <div style={{ marginBottom: '22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                          Service Operating Radius:
                        </label>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#e5c158' }}>
                          Up to {profServiceRadius} km around {profCity || 'Base City'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="500"
                        step="10"
                        value={profServiceRadius}
                        onChange={(e) => setProfServiceRadius(parseInt(e.target.value, 10))}
                        style={{ width: '100%', accentColor: '#ff2a73', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
                        <span>10 km (Local Only)</span>
                        <span>100 km (Regional)</span>
                        <span>250 km (Statewide)</span>
                        <span>500 km (Interstate)</span>
                      </div>
                    </div>

                    {/* Service Area Cities Tags */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                        Configured Service Area Cities & Regions
                      </label>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <input
                          type="text"
                          value={newCityTag}
                          onChange={(e) => setNewCityTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCityTag();
                            }
                          }}
                          placeholder="Enter city or district (e.g. Udaipur, Agra) and press Add"
                          style={{
                            flex: 1,
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            color: '#fff',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCityTag}
                          style={{
                            background: 'rgba(229,193,88,0.15)',
                            border: '1px solid rgba(229,193,88,0.4)',
                            color: '#e5c158',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          + Add City
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {profServiceAreaCities.length === 0 ? (
                          <span style={{ fontSize: '12px', color: '#a0aec0', fontStyle: 'italic' }}>
                            No service areas added yet. Your primary city ({profCity || 'N/A'}) will be used by default.
                          </span>
                        ) : (
                          profServiceAreaCities.map((c) => (
                            <span
                              key={c}
                              style={{
                                background: '#0a271c',
                                border: '1px solid rgba(229,193,88,0.3)',
                                borderRadius: '16px',
                                padding: '5px 12px',
                                fontSize: '12px',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              📍 {c}
                              <button
                                type="button"
                                onClick={() => handleRemoveCityTag(c)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ff6b9d',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                }}
                              >
                                ✕
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Venue Travel Toggle */}
                    <div style={{ background: '#0a271c', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
                          ✈️ Willing to travel to Event Venue / Destination Weddings
                        </div>
                        <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>
                          Let couples know whether your team accepts travel assignments outside your home city.
                        </div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={profTravelsToVenue}
                          onChange={(e) => setProfTravelsToVenue(e.target.checked)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: profTravelsToVenue ? '#38a169' : '#4a5568',
                          borderRadius: '26px',
                          transition: '0.3s',
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '""',
                            height: '20px',
                            width: '20px',
                            left: profTravelsToVenue ? '24px' : '3px',
                            bottom: '3px',
                            background: '#fff',
                            borderRadius: '50%',
                            transition: '0.3s',
                          }} />
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Card 4: Permitted Business Contact Channels */}
                  <div style={{ background: '#061d15', border: '1px solid rgba(229,193,88,0.2)', borderRadius: '16px', padding: '24px' }}>
                    <div style={{ borderBottom: '1px solid rgba(229,193,88,0.15)', paddingBottom: '12px', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>
                        4. Public Business Contact Details (For Client Inquiries)
                      </h3>
                      <p style={{ fontSize: '12px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                        Provide official contact channels for couples to reach your wedding management desk.
                      </p>
                    </div>

                    <div style={{
                      background: 'rgba(56,161,105,0.1)',
                      border: '1px solid rgba(56,161,105,0.3)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '20px',
                      fontSize: '12px',
                      color: '#c6f6d5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '16px' }}>🛡️</span>
                      <div>
                        <strong>Privacy Architecture Protected:</strong> Only the permitted business channels below are shared with verified clients. Your private KYC records, PAN number, bank account details, and passport/voter scans are encrypted and strictly confidential.
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          Client Inquiry Phone / WhatsApp
                        </label>
                        <input
                          type="text"
                          value={profPhone}
                          onChange={(e) => setProfPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          Official Business Inquiry Email
                        </label>
                        <input
                          type="email"
                          value={profEmail}
                          onChange={(e) => setProfEmail(e.target.value)}
                          placeholder="bookings@royalclicks.com"
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          Official Website URL
                        </label>
                        <input
                          type="url"
                          value={profWebsite}
                          onChange={(e) => setProfWebsite(e.target.value)}
                          placeholder="https://royalclicksphotography.com"
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                          Instagram / Portfolio Handle
                        </label>
                        <input
                          type="text"
                          value={profInstagram}
                          onChange={(e) => setProfInstagram(e.target.value)}
                          placeholder="@royalclicks_weddings"
                          style={{
                            width: '100%',
                            background: '#0a271c',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '8px',
                            padding: '11px 14px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Action Bar */}
                  <div style={{
                    background: '#061d15',
                    border: '1px solid rgba(229,193,88,0.2)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                        Ready to update your business profile?
                      </div>
                      <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>
                        Changes are saved immediately to MySQL and reflected across category and search filters.
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingBusinessProfile}
                      style={{
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        border: 'none',
                        padding: '12px 28px',
                        borderRadius: '10px',
                        cursor: savingBusinessProfile ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 16px rgba(230, 0, 92, 0.4)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: savingBusinessProfile ? 0.7 : 1,
                      }}
                    >
                      {savingBusinessProfile ? (
                        <>
                          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                          Saving Business Profile...
                        </>
                      ) : (
                        '💾 Save Business Profile Changes'
                      )}
                    </button>
                  </div>

                </div>
              </form>
            </div>
          )}

          {/* ================= TAB: WEDDING SERVICES ================= */}
          {activeTab === 'services' && (
            <div>
              {/* Top Header Card with Stats & Action */}
              <div style={{ background: '#061d15', border: '1px solid rgba(229,193,88,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Wedding Services & Offerings</h2>
                    <span style={{ background: 'rgba(229,193,88,0.15)', color: '#e5c158', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(229,193,88,0.3)' }}>
                      {services.length} Total Services
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#a0aec0', marginTop: '6px', marginBottom: 0 }}>
                    Manage your standalone wedding services. New or modified service offerings undergo administrative moderation before appearing in customer searches.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddService}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 22px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>+</span> Add New Wedding Service
                </button>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div style={{ background: '#072218', border: '1px solid rgba(229,193,88,0.18)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approved & Live</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78', marginTop: '4px' }}>
                    {services.filter(s => s.moderation_status === 'APPROVED' && s.is_active).length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Publicly discoverable</div>
                </div>
                <div style={{ background: '#072218', border: '1px solid rgba(229,193,88,0.18)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Admin Review</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ed8936', marginTop: '4px' }}>
                    {services.filter(s => s.moderation_status === 'PENDING_REVIEW').length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Awaiting verification</div>
                </div>
                <div style={{ background: '#072218', border: '1px solid rgba(229,193,88,0.18)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paused / Inactive</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#cbd5e0', marginTop: '4px' }}>
                    {services.filter(s => !s.is_active).length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Hidden from search</div>
                </div>
                <div style={{ background: '#072218', border: '1px solid rgba(229,193,88,0.18)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Needs Revision</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f56565', marginTop: '4px' }}>
                    {services.filter(s => s.moderation_status === 'REJECTED').length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Admin feedback provided</div>
                </div>
              </div>

              {/* Services List / Grid */}
              {services.length === 0 ? (
                <div style={{ background: '#061d15', border: '1px dashed rgba(229,193,88,0.3)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                  <div style={{ fontSize: '42px', marginBottom: '16px' }}>🛎️</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>No Wedding Services Created Yet</h3>
                  <p style={{ fontSize: '14px', color: '#a0aec0', maxWidth: '500px', margin: '0 auto 20px auto' }}>
                    Add standalone wedding services that you offer (e.g. Drone Cinematography, Pre-Wedding Shoot, Bridal Makeup, Destination Coordination).
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddService}
                    style={{
                      padding: '11px 24px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                    }}
                  >
                    + Create First Service
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                  {services.map((srv: any) => {
                    const isApproved = srv.moderation_status === 'APPROVED';
                    const isPending = srv.moderation_status === 'PENDING_REVIEW';
                    const isRejected = srv.moderation_status === 'REJECTED';

                    return (
                      <div
                        key={srv.id}
                        style={{
                          background: '#072218',
                          border: isRejected ? '1px solid rgba(245,101,101,0.45)' : '1px solid rgba(229,193,88,0.22)',
                          borderRadius: '16px',
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                        }}
                      >
                        <div>
                          {/* Title & Status Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                            <div>
                              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>{srv.title}</h3>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                {srv.category_name && (
                                  <span style={{ fontSize: '11px', background: 'rgba(229,193,88,0.12)', color: '#e5c158', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(229,193,88,0.25)', fontWeight: 600 }}>
                                    🏷️ {srv.category_name}
                                  </span>
                                )}
                                {srv.service_location && (
                                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e0', padding: '2px 8px', borderRadius: '6px' }}>
                                    📍 {srv.service_location}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Moderation Badge */}
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                background: isApproved ? 'rgba(56,161,105,0.2)' : isPending ? 'rgba(237,137,54,0.2)' : 'rgba(245,101,101,0.2)',
                                color: isApproved ? '#48bb78' : isPending ? '#ed8936' : '#f56565',
                                border: `1px solid ${isApproved ? '#48bb78' : isPending ? '#ed8936' : '#f56565'}`,
                              }}
                            >
                              {isApproved ? '✓ APPROVED' : isPending ? '⏳ IN REVIEW' : '✕ REJECTED'}
                            </span>
                          </div>

                          {/* Pricing */}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '14px 0 10px 0' }}>
                            <span style={{ fontSize: '12px', color: '#a0aec0' }}>Starting from</span>
                            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#e5c158' }}>
                              ₹{parseFloat(srv.starting_price || 0).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Description */}
                          <p style={{ fontSize: '13px', color: '#a0aec0', lineHeight: '1.5', minHeight: '40px', marginBottom: '14px' }}>
                            {srv.description || 'No description provided for this wedding service.'}
                          </p>

                          {/* Rejection Note if rejected */}
                          {isRejected && srv.rejection_reason && (
                            <div style={{ background: 'rgba(245,101,101,0.12)', border: '1px solid #f56565', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#feb2b2', textTransform: 'uppercase' }}>Reason for Rejection:</div>
                              <div style={{ fontSize: '12px', color: '#fff', marginTop: '2px' }}>{srv.rejection_reason}</div>
                            </div>
                          )}
                        </div>

                        {/* Footer Controls: Toggle & Edit/Delete Buttons */}
                        <div style={{ borderTop: '1px solid rgba(229,193,88,0.15)', paddingTop: '16px', marginTop: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', color: srv.is_active ? '#48bb78' : '#a0aec0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: srv.is_active ? '#48bb78' : '#718096' }}></span>
                              {srv.is_active ? 'Active & Discoverable' : 'Paused / Inactive'}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleToggleServiceActive(srv)}
                              style={{
                                fontSize: '11px',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                background: srv.is_active ? 'rgba(56,161,105,0.2)' : 'rgba(255,255,255,0.1)',
                                color: srv.is_active ? '#48bb78' : '#cbd5e0',
                                border: `1px solid ${srv.is_active ? '#48bb78' : '#718096'}`,
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              {srv.is_active ? 'Pause Service' : 'Activate Service'}
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditService(srv)}
                              style={{
                                flex: 1,
                                padding: '9px 12px',
                                borderRadius: '8px',
                                background: 'rgba(229,193,88,0.12)',
                                border: '1px solid rgba(229,193,88,0.3)',
                                color: '#e5c158',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              ✏️ Edit Details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteService(srv.id, srv.title)}
                              style={{
                                padding: '9px 14px',
                                borderRadius: '8px',
                                background: 'rgba(230,0,92,0.12)',
                                border: '1px solid rgba(255,42,115,0.35)',
                                color: '#ff80ab',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ================= ADD / EDIT SERVICE MODAL ================= */}
              {showServiceModal && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '560px',
                      width: '100%',
                      background: 'linear-gradient(180deg, #07251a 0%, #031710 100%)',
                      border: '1.5px solid rgba(229,193,88,0.35)',
                      borderRadius: '20px',
                      padding: '28px',
                      boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(255,42,115,0.15)',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(229,193,88,0.15)', paddingBottom: '14px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                          {editingService ? 'Edit Wedding Service' : 'Add New Wedding Service'}
                        </h3>
                        <p style={{ fontSize: '12px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                          {editingService ? 'Updating service content will re-submit this offering for compliance review.' : 'All services require administrative approval prior to customer listing.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowServiceModal(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#a0aec0',
                          fontSize: '22px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {serviceActionErr && (
                      <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #e6005c', color: '#ffb3c6', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                        ⚠️ {serviceActionErr}
                      </div>
                    )}

                    <form onSubmit={handleSaveService}>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '6px' }}>
                          SERVICE TITLE / NAME *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Drone Cinematography / Bridal HD Makeup / Royal Catering"
                          value={srvTitle}
                          onChange={(e) => setSrvTitle(e.target.value)}
                          required
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '14px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '6px' }}>
                            CATEGORY *
                          </label>
                          <select
                            value={srvCategoryId}
                            onChange={(e) => setSrvCategoryId(e.target.value)}
                            required
                            style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '14px' }}
                          >
                            <option value="">-- Select Category --</option>
                            {allCategories.map((c: any) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '6px' }}>
                            STARTING PRICE (₹) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="15000"
                            value={srvStartingPrice}
                            onChange={(e) => setSrvStartingPrice(e.target.value)}
                            required
                            style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '14px' }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '6px' }}>
                          SERVICE LOCATION / OPERATIONAL AREA
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Delhi NCR, Jaipur, Goa, Pan-India"
                          value={srvLocation}
                          onChange={(e) => setSrvLocation(e.target.value)}
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '14px' }}
                        />
                        <span style={{ fontSize: '11px', color: '#718096', marginTop: '4px', display: 'block' }}>
                          Defaults to your primary location ({profCity || vendorData?.city || 'Registered city'}) if omitted.
                        </span>
                      </div>

                      <div style={{ marginBottom: '22px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '6px' }}>
                          DETAILED SERVICE DESCRIPTION
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Describe deliverables, equipment, team size, turnaround time, or inclusions for this service..."
                          value={srvDescription}
                          onChange={(e) => setSrvDescription(e.target.value)}
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '14px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setShowServiceModal(false)}
                          style={{
                            padding: '11px 20px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#cbd5e0',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingService}
                          style={{
                            padding: '11px 26px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                          }}
                        >
                          {savingService ? 'Saving Service...' : (editingService ? 'Update Service' : 'Submit Service for Review')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: ONBOARDING & KYC ================= */}
          {activeTab === 'onboarding' && (
            <div>
              {/* Top Status Banner */}
              {onboardingStatus === 'APPROVED' ? (
                <div style={{ background: 'rgba(56,161,105,0.18)', border: '1.5px solid #38a169', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#38a169', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#fff', flexShrink: 0 }}>✓</div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#48bb78', margin: 0 }}>Vendor Partner Account Verified & Active</h3>
                    <p style={{ fontSize: '13px', color: '#c6f6d5', margin: '4px 0 0 0' }}>
                      Your KYC credentials, business profile, and payout details have been approved by WedWithMe Compliance. Your storefront is publicly visible with the <strong>Verified Partner</strong> badge.
                    </p>
                  </div>
                </div>
              ) : onboardingStatus === 'REJECTED' ? (
                <div style={{ background: 'rgba(230,0,92,0.18)', border: '1.5px solid #e6005c', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e6005c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#fff', flexShrink: 0 }}>✕</div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff6b9d', margin: 0 }}>KYC Compliance Review Rejected</h3>
                      <p style={{ fontSize: '13px', color: '#fed7e2', margin: '4px 0 0 0' }}>
                        Reason: <strong>{onboardingData?.rejection_reason || 'Missing or unverified documents.'}</strong>. Please update your information or re-upload clear documents below.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSubmitOnboarding}
                    style={{
                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                      color: '#fff',
                      fontWeight: 'bold',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                    }}
                  >
                    Re-Submit for Review
                  </button>
                </div>
              ) : onboardingStatus === 'UNDER_REVIEW' ? (
                <div style={{ background: 'rgba(237,137,54,0.18)', border: '1.5px solid #ed8936', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#ed8936', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#fff', flexShrink: 0 }}>⏳</div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f6ad55', margin: 0 }}>Dossier Submitted & Under Review</h3>
                    <p style={{ fontSize: '13px', color: '#feebc8', margin: '4px 0 0 0' }}>
                      Your KYC documents and business credentials have been submitted to the WedWithMe compliance desk. Compliance reviews are typically completed within 24 hours.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#061d15', border: '1px solid rgba(229,193,88,0.25)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>Onboarding Dossier Status: DRAFT</h3>
                    <p style={{ fontSize: '13px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                      Complete the 4 verification checkpoints below and submit your dossier for compliance audit.
                    </p>
                  </div>
                  <button
                    onClick={handleSubmitOnboarding}
                    style={{
                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                      color: '#fff',
                      fontWeight: 'bold',
                      border: 'none',
                      padding: '11px 22px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                    }}
                  >
                    Submit for Compliance Review
                  </button>
                </div>
              )}

              {/* Onboarding Checklist Card with Progress Bar */}
              {(() => {
                const checklist = onboardingData?.checklist || {
                  business_profile: !!vendorData?.business_name && !!vendorData?.city,
                  documents_uploaded: documents.length > 0,
                  pan_uploaded: documents.some((d: any) => d.doc_type === 'PAN') || !!vendorData?.pan_number,
                  bank_details: !!vendorData?.bank_account_number && !!vendorData?.bank_ifsc,
                  packages_configured: packages.length > 0 || services.length > 0,
                };
                const completedCount = [
                  checklist.business_profile,
                  checklist.documents_uploaded || checklist.pan_uploaded,
                  checklist.bank_details,
                  checklist.packages_configured,
                ].filter(Boolean).length;
                const progressPct = Math.round((completedCount / 4) * 100);

                return (
                  <div style={{ background: '#072218', border: '1.5px solid rgba(229,193,88,0.3)', borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>Vendor Onboarding Checklist</h3>
                        <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>Real-time database verification status</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: progressPct === 100 ? '#48bb78' : '#e5c158' }}>
                        {progressPct}% Complete ({completedCount} of 4 checkpoints)
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', background: '#0a271c', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
                      <div style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        background: progressPct === 100 ? 'linear-gradient(90deg, #38a169, #48bb78)' : 'linear-gradient(90deg, #ff2a73, #e5c158)',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>

                    {/* 4 Checkpoint Badges */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div style={{ background: '#061d15', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${checklist.business_profile ? 'rgba(56,161,105,0.4)' : 'rgba(237,137,54,0.4)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', color: checklist.business_profile ? '#48bb78' : '#ed8936' }}>{checklist.business_profile ? '✓' : '○'}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>1. Business Profile</div>
                          <div style={{ fontSize: '11px', color: checklist.business_profile ? '#48bb78' : '#ed8936' }}>{checklist.business_profile ? 'Verified Complete' : 'Incomplete'}</div>
                        </div>
                      </div>

                      <div style={{ background: '#061d15', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${checklist.documents_uploaded || checklist.pan_uploaded ? 'rgba(56,161,105,0.4)' : 'rgba(237,137,54,0.4)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', color: checklist.documents_uploaded || checklist.pan_uploaded ? '#48bb78' : '#ed8936' }}>{checklist.documents_uploaded || checklist.pan_uploaded ? '✓' : '○'}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>2. KYC Documents</div>
                          <div style={{ fontSize: '11px', color: checklist.documents_uploaded || checklist.pan_uploaded ? '#48bb78' : '#ed8936' }}>{checklist.documents_uploaded || checklist.pan_uploaded ? `${documents.length} Uploaded` : 'Action Required'}</div>
                        </div>
                      </div>

                      <div style={{ background: '#061d15', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${checklist.bank_details ? 'rgba(56,161,105,0.4)' : 'rgba(237,137,54,0.4)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', color: checklist.bank_details ? '#48bb78' : '#ed8936' }}>{checklist.bank_details ? '✓' : '○'}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>3. Bank & Payouts</div>
                          <div style={{ fontSize: '11px', color: checklist.bank_details ? '#48bb78' : '#ed8936' }}>{checklist.bank_details ? 'Configured' : 'Missing Details'}</div>
                        </div>
                      </div>

                      <div style={{ background: '#061d15', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${checklist.packages_configured ? 'rgba(56,161,105,0.4)' : 'rgba(237,137,54,0.4)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', color: checklist.packages_configured ? '#48bb78' : '#ed8936' }}>{checklist.packages_configured ? '✓' : '○'}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>4. Service Packages</div>
                          <div style={{ fontSize: '11px', color: checklist.packages_configured ? '#48bb78' : '#ed8936' }}>{packages.length} Configured</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Grid: 1. Business Profile & 2. Bank Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                {/* Step 1 Card: Business Profile */}
                <div style={{ background: '#072218', padding: '24px', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>1. Business Profile & Contact</h3>
                    <button
                      onClick={() => setEditProfileMode(!editProfileMode)}
                      style={{ background: 'transparent', border: '1px solid rgba(229,193,88,0.3)', color: '#e5c158', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      {editProfileMode ? 'Cancel' : 'Edit Profile'}
                    </button>
                  </div>

                  {editProfileMode ? (
                    <form onSubmit={handleSaveBusinessProfile}>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '4px' }}>BUSINESS NAME</label>
                        <input
                          type="text"
                          value={editBusinessName}
                          onChange={(e) => setEditBusinessName(e.target.value)}
                          style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '4px' }}>CITY</label>
                          <input
                            type="text"
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '4px' }}>STARTING PRICE (₹)</label>
                          <input
                            type="number"
                            value={editStartingPrice}
                            onChange={(e) => setEditStartingPrice(e.target.value)}
                            style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '4px' }}>STUDIO ADDRESS</label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        />
                      </div>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '4px' }}>DESCRIPTION</label>
                        <textarea
                          rows={2}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #ff2a73, #e6005c)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                      >
                        {savingProfile ? 'Saving...' : 'Update Business Profile'}
                      </button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                        <span style={{ color: '#a0aec0' }}>Business Name:</span>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>{vendorData?.business_name}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                        <span style={{ color: '#a0aec0' }}>Category:</span>
                        <span style={{ color: '#e5c158' }}>{vendorData?.category_name || 'Wedding Partner'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                        <span style={{ color: '#a0aec0' }}>Operating City:</span>
                        <span style={{ color: '#fff' }}>{vendorData?.city}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                        <span style={{ color: '#a0aec0' }}>Studio Address:</span>
                        <span style={{ color: '#cbd5e0', maxWidth: '180px', textAlign: 'right' }}>{vendorData?.address || 'Not specified'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#a0aec0' }}>Starting Price:</span>
                        <span style={{ color: '#48bb78', fontWeight: 'bold' }}>₹{parseFloat(vendorData?.starting_price || 15000).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3 Card: Bank & Payout Details */}
                <div style={{ background: '#072218', padding: '24px', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e5c158', marginBottom: '8px' }}>3. Bank Account & Settlement Payouts</h3>
                  <p style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '14px' }}>
                    Escrow payouts are transferred directly to this account upon event completion.
                  </p>
                  <form onSubmit={handleSaveBankDetails}>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '3px' }}>BANK ACCOUNT NUMBER *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 50100234567890"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '3px' }}>BANK IFSC CODE *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. HDFC0001234"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value)}
                        style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '3px' }}>PAN CARD NUMBER</label>
                        <input
                          type="text"
                          placeholder="ABCDE1234F"
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value)}
                          style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '3px' }}>GST NUMBER (OPTIONAL)</label>
                        <input
                          type="text"
                          placeholder="07AAAAA0000A1Z5"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value)}
                          style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={savingBank}
                      style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #ff2a73, #e6005c)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                      {savingBank ? 'Saving...' : 'Save Bank & Payout Details'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Step 2: KYC & Compliance Documents Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                {/* KYC Upload Form with Real File Input */}
                <div style={{ background: '#072218', padding: '24px', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e5c158', marginBottom: '6px' }}>2. Upload KYC Document</h3>
                  <p style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '16px' }}>
                    Upload clear PDF, JPEG, or PNG scans up to 10MB.
                  </p>
                  <form onSubmit={handleUploadDocument}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '4px' }}>DOCUMENT TYPE *</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                      >
                        <option value="PAN">PAN Card (Mandatory for Tax & Payouts)</option>
                        <option value="BANK_PASSBOOK">Bank Passbook / Cancelled Cheque</option>
                        <option value="GST">GST Registration Certificate (Optional)</option>
                        <option value="BUSINESS_REG">Business Registration / MSME / Shop Act</option>
                        <option value="ID_PROOF">Aadhaar / Voter ID / Passport</option>
                        <option value="OTHER">Other Proof / Award Certification</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '4px' }}>DOCUMENT NUMBER / IDENTIFIER</label>
                      <input
                        type="text"
                        placeholder="e.g. ABCDE1234F or Cheque Ref"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>

                    {/* File Picker */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#a0aec0', marginBottom: '4px' }}>CHOOSE DOCUMENT FILE (MAX 10MB) *</label>
                      <div style={{
                        border: '1.5px dashed rgba(229,193,88,0.35)',
                        borderRadius: '10px',
                        padding: '16px',
                        textAlign: 'center',
                        background: '#061d15',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="file"
                          id="kyc-file-input"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSelectedFile(e.target.files[0]);
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="kyc-file-input" style={{ cursor: 'pointer', display: 'block' }}>
                          <div style={{ fontSize: '24px', marginBottom: '4px' }}>📁</div>
                          {selectedFile ? (
                            <div style={{ color: '#48bb78', fontWeight: 'bold', fontSize: '13px' }}>
                              ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </div>
                          ) : (
                            <div>
                              <div style={{ color: '#e5c158', fontSize: '13px', fontWeight: 600 }}>Click to browse or drag file here</div>
                              <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>Supported: PDF, JPG, PNG, WebP (Max 10MB)</div>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={uploadingDoc}
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: uploadingDoc ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      {uploadingDoc ? 'Uploading File via Storage Abstraction...' : 'Upload KYC Document'}
                    </button>
                  </form>
                </div>

                {/* Uploaded Documents List */}
                <div style={{ background: '#072218', padding: '24px', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>Compliance Status Ledger</h3>
                    <span style={{ fontSize: '12px', color: '#a0aec0' }}>{documents.length} document(s)</span>
                  </div>

                  {documents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 12px', color: '#a0aec0', fontSize: '13px' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
                      No KYC documents uploaded yet. Upload your PAN card and Bank Passbook to activate verified payouts.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '340px', overflowY: 'auto' }}>
                      {documents.map((d: any) => (
                        <div key={d.id} style={{ background: '#0a271c', padding: '14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{d.doc_type}</div>
                            <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>
                              {d.document_number ? `Doc: ${d.document_number} • ` : ''}
                              {d.file_size ? `${Math.round(d.file_size / 1024)} KB • ` : ''}
                              {new Date(d.created_at).toLocaleDateString()}
                            </div>
                            {d.file_url && (
                              <a
                                href={d.file_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '11px', color: '#ff759f', textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}
                              >
                                View Document File ↗
                              </a>
                            )}
                            {d.rejection_reason && (
                              <div style={{ fontSize: '11px', color: '#ff6b9d', marginTop: '4px' }}>
                                Reason: {d.rejection_reason}
                              </div>
                            )}
                          </div>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', flexShrink: 0,
                            background: d.verification_status === 'VERIFIED' ? 'rgba(56,161,105,0.2)' : d.verification_status === 'REJECTED' ? 'rgba(230,0,92,0.2)' : 'rgba(237,137,54,0.2)',
                            color: d.verification_status === 'VERIFIED' ? '#48bb78' : d.verification_status === 'REJECTED' ? '#ff6b9d' : '#ed8936',
                            border: `1px solid ${d.verification_status === 'VERIFIED' ? '#48bb78' : d.verification_status === 'REJECTED' ? '#ff6b9d' : '#ed8936'}`,
                          }}>
                            {d.verification_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Packages & Services Shortcut */}
              <div style={{ background: '#061d15', border: '1px solid rgba(229,193,88,0.2)', borderRadius: '16px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0 }}>4. Wedding Packages & Service Catalog</h4>
                  <p style={{ fontSize: '13px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                    You have configured <strong>{packages.length} package(s)</strong> and <strong>{services.length} individual service(s)</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('packages')}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(229,193,88,0.4)',
                    color: '#e5c158',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Manage Packages & Services →
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 3: PACKAGES & SERVICES ================= */}
          {activeTab === 'packages' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                {/* Create Package Form */}
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Create Wedding Package</h3>
                  <form onSubmit={handleCreatePackage}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>PACKAGE NAME</label>
                      <input
                        type="text"
                        placeholder="e.g. Royal Imperial Package"
                        value={newPkgName}
                        onChange={(e) => setNewPkgName(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>PRICE (₹)</label>
                        <input
                          type="number"
                          placeholder="75000"
                          value={newPkgPrice}
                          onChange={(e) => setNewPkgPrice(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>GUEST CAPACITY</label>
                        <input
                          type="number"
                          value={newPkgCapacity}
                          onChange={(e) => setNewPkgCapacity(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>DESCRIPTION</label>
                      <textarea
                        rows={2}
                        placeholder="Describe what makes this package special..."
                        value={newPkgDesc}
                        onChange={(e) => setNewPkgDesc(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>INCLUSIONS (Comma separated)</label>
                      <input
                        type="text"
                        value={newPkgInclusions}
                        onChange={(e) => setNewPkgInclusions(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      Save & Submit Package
                    </button>
                  </form>
                </div>

                {/* Create Service Form */}
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Add Standalone Service</h3>
                  <form onSubmit={handleCreateService}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>SERVICE TITLE</label>
                      <input
                        type="text"
                        placeholder="e.g. Drone Cinematography / Bridal Makeup"
                        value={newSrvTitle}
                        onChange={(e) => setNewSrvTitle(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>STARTING PRICE (₹)</label>
                      <input
                        type="number"
                        placeholder="15000"
                        value={newSrvPrice}
                        onChange={(e) => setNewSrvPrice(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>DESCRIPTION</label>
                      <textarea
                        rows={3}
                        value={newSrvDesc}
                        onChange={(e) => setNewSrvDesc(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      Save Service
                    </button>
                  </form>
                </div>
              </div>

              {/* Active Packages List */}
              <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Configured Packages</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {packages.map((pkg: any) => (
                    <div key={pkg.id} style={{ background: '#072218', border: '1px solid rgba(229,193,88,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{pkg.name}</h4>
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: pkg.moderation_status === 'APPROVED' ? 'rgba(56,161,105,0.2)' : 'rgba(237,137,54,0.2)', color: pkg.moderation_status === 'APPROVED' ? '#48bb78' : '#ed8936' }}>
                            {pkg.moderation_status || 'APPROVED'}
                          </span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e5c158', margin: '8px 0' }}>
                          ₹{parseFloat(pkg.price).toLocaleString('en-IN')}
                        </div>
                        <p style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '12px' }}>{pkg.description || 'All-inclusive wedding service'}</p>
                        <div style={{ fontSize: '12px', color: '#cbd5e0' }}>Capacity: {pkg.guest_capacity} guests</div>
                      </div>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        style={{
                          marginTop: '16px',
                          padding: '8px 14px',
                          background: 'rgba(230,0,92,0.15)',
                          border: '1px solid #ff2a73',
                          color: '#ff80ab',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Delete Package
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: CALENDAR & AVAILABILITY ================= */}
          {activeTab === 'calendar' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Manage Date Availability</h3>
                  <form onSubmit={handleToggleAvailability}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>SELECT DATE TO BLOCK</label>
                      <input
                        type="date"
                        value={blockDate}
                        onChange={(e) => setBlockDate(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>REASON / NOTES</label>
                      <input
                        type="text"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      Mark Date Unavailable / Blocked
                    </button>
                  </form>
                </div>

                {/* Confirmed Booked Dates Guard */}
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Locked & Committed Dates</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {availability?.confirmed_bookings?.length === 0 ? (
                      <p style={{ color: '#a0aec0', fontSize: '13px' }}>No locked confirmed bookings yet. Dates automatically lock when client completes escrow payment.</p>
                    ) : (
                      availability?.confirmed_bookings?.map((b: any, idx: number) => (
                        <div key={idx} style={{ background: '#0a271c', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#e5c158' }}>{new Date(b.date).toLocaleDateString()}</div>
                            <div style={{ fontSize: '12px', color: '#a0aec0' }}>Booking {b.booking_number}</div>
                          </div>
                          <span style={{ fontSize: '11px', background: 'rgba(56,161,105,0.2)', color: '#48bb78', padding: '3px 8px', borderRadius: '6px' }}>
                            LOCKED (No Double-Booking)
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 5: BOOKINGS & LEADS ================= */}
          {activeTab === 'bookings' && (
            <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Direct Booking Inquiries & Fulfillment</h2>
              {bookings.length === 0 ? (
                <p style={{ color: '#a0aec0', textAlign: 'center', padding: '24px 0' }}>No inquiries received yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#0a271c', color: '#e5c158' }}>
                        <th style={{ padding: '12px' }}>Booking #</th>
                        <th style={{ padding: '12px' }}>Client Info</th>
                        <th style={{ padding: '12px' }}>Event Date & Guests</th>
                        <th style={{ padding: '12px' }}>Net Payout Amount</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b: any) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', color: '#e5c158', fontWeight: 'bold' }}>{b.booking_number}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ color: '#fff', fontWeight: 'bold' }}>{b.customer_name}</div>
                            <div style={{ fontSize: '12px', color: '#a0aec0' }}>{b.customer_phone || 'Protected (Available after confirmation)'}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ color: '#fff' }}>{new Date(b.event_date).toLocaleDateString()}</div>
                            <div style={{ fontSize: '12px', color: '#a0aec0' }}>{b.guest_count} guests</div>
                          </td>
                          <td style={{ padding: '12px', color: '#48bb78', fontWeight: 'bold' }}>
                            ₹{parseFloat(b.vendor_payout_amount).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                              background: b.status === 'CONFIRMED' ? 'rgba(56,161,105,0.2)' : b.status === 'IN_PROGRESS' ? 'rgba(49,130,206,0.2)' : 'rgba(237,137,54,0.2)',
                              color: b.status === 'CONFIRMED' ? '#48bb78' : b.status === 'IN_PROGRESS' ? '#63b3ed' : '#ed8936',
                            }}>
                              {b.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {b.status === 'REQUESTED' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(b.id, 'ACCEPTED')}
                                    style={{
                                      padding: '6px 14px',
                                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      boxShadow: '0 2px 8px rgba(230,0,92,0.38)',
                                    }}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(b.id, 'REJECTED')}
                                    style={{
                                      padding: '6px 12px',
                                      background: 'rgba(230,0,92,0.15)',
                                      border: '1px solid #ff2a73',
                                      color: '#ff80ab',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                              {b.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleUpdateStatus(b.id, 'IN_PROGRESS')}
                                  style={{
                                    padding: '6px 14px',
                                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    boxShadow: '0 2px 8px rgba(230,0,92,0.38)',
                                  }}
                                >
                                  Start Fulfillment
                                </button>
                              )}
                              {b.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                                  style={{
                                    padding: '6px 14px',
                                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    boxShadow: '0 2px 8px rgba(230,0,92,0.38)',
                                  }}
                                >
                                  Mark Completed
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 6: PORTFOLIO & REELS ================= */}
          {activeTab === 'portfolio' && (
            <div>
              <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Upload Wedding Showcase Reel</h3>
                <form onSubmit={handleUploadReel} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>REEL TITLE</label>
                    <input
                      type="text"
                      placeholder="e.g. 4K Drone Mandap Reveal"
                      value={reelTitle}
                      onChange={(e) => setReelTitle(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>VIDEO URL (.mp4)</label>
                    <input
                      type="text"
                      placeholder="https://storage.googleapis.com/.../video.mp4"
                      value={reelVideoUrl}
                      onChange={(e) => setReelVideoUrl(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>THUMBNAIL IMAGE URL</label>
                    <input
                      type="text"
                      placeholder="/images/photographer.jpg"
                      value={reelThumbUrl}
                      onChange={(e) => setReelThumbUrl(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      Upload Reel
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Reels Preview */}
              <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Your Approved Showcase Reels</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  {reels.map((reel: any) => (
                    <div key={reel.id} style={{ background: '#072218', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(229,193,88,0.2)' }}>
                      <img src={reel.thumbnail_url} alt={reel.title} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{reel.title}</div>
                        <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Views: {reel.views_count} • Likes: {reel.likes_count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
