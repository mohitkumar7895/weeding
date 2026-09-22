'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PackageComparisonModal from '@/components/PackageComparisonModal';
import { homePathForRole } from '@/lib/roleHome';

export default function VendorDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'services' | 'onboarding' | 'packages' | 'calendar' | 'bookings' | 'portfolio'>('overview');
  const [vendorData, setVendorData] = useState<any>(null);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [earningsPeriod, setEarningsPeriod] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
  const [earningsFromDate, setEarningsFromDate] = useState<string>('');
  const [earningsToDate, setEarningsToDate] = useState<string>('');
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [activeEarningsSubTab, setActiveEarningsSubTab] = useState<'financials' | 'settlements' | 'performance'>('financials');
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

  // Dedicated Packages & Add-ons States
  const [addOns, setAddOns] = useState<any[]>([]);
  const [servicePackagesModalSrv, setServicePackagesModalSrv] = useState<any | null>(null);
  const [srvPackagesActiveTab, setSrvPackagesActiveTab] = useState<'packages' | 'addons'>('packages');

  // Package Form Modal States
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgTier, setPkgTier] = useState<'BASIC' | 'STANDARD' | 'PREMIUM' | 'CUSTOM'>('STANDARD');
  const [pkgPrice, setPkgPrice] = useState('50000');
  const [pkgGuestCapacity, setPkgGuestCapacity] = useState('200');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgInclusions, setPkgInclusions] = useState('');
  const [pkgServiceId, setPkgServiceId] = useState('');
  const [pkgIsActive, setPkgIsActive] = useState(true);
  const [savingPackage, setSavingPackage] = useState(false);
  const [pkgActionErr, setPkgActionErr] = useState<string | null>(null);

  // Add-on Form Modal States
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState<any | null>(null);
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState('5000');
  const [addonDescription, setAddonDescription] = useState('');
  const [addonServiceId, setAddonServiceId] = useState('');
  const [addonPackageId, setAddonPackageId] = useState('');
  const [addonIsActive, setAddonIsActive] = useState(true);
  const [savingAddOn, setSavingAddOn] = useState(false);
  const [addonActionErr, setAddonActionErr] = useState<string | null>(null);

  // Comparison Preview Modal States
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonServiceId, setComparisonServiceId] = useState<string | undefined>(undefined);

  // Dedicated Portfolio & Showcase States
  const [portfolioStats, setPortfolioStats] = useState<any | null>(null);
  const [portfolioFilter, setPortfolioFilter] = useState<'all' | 'image' | 'video' | 'pending' | 'approved'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMediaType, setUploadMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadThumbnailFile, setUploadThumbnailFile] = useState<File | null>(null);
  const [uploadThumbnailPreviewUrl, setUploadThumbnailPreviewUrl] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadServiceId, setUploadServiceId] = useState('');
  const [uploadIsCover, setUploadIsCover] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedPreviewMedia, setSelectedPreviewMedia] = useState<any | null>(null);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);

  // Unified Packages Tab Filter
  const [selectedFilterServiceId, setSelectedFilterServiceId] = useState<string>('all');

  // Dedicated Bookings Management States
  const [bookingFilterStatus, setBookingFilterStatus] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [bookingSearch, setBookingSearch] = useState('');
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<any | null>(null);
  const [loadingBookingDetail, setLoadingBookingDetail] = useState(false);
  const [declineBookingModalItem, setDeclineBookingModalItem] = useState<any | null>(null);
  const [declineReason, setDeclineReason] = useState('Date unavailable / Fully committed');
  const [declineCustomNote, setDeclineCustomNote] = useState('');
  const [submittingDecline, setSubmittingDecline] = useState(false);
  const [chatModalBooking, setChatModalBooking] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatNewMessage, setChatNewMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingChatMessage, setSendingChatMessage] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

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

  // Dedicated Availability & Calendar States
  const [calendarMonth, setCalendarMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarServiceId, setCalendarServiceId] = useState<string>('ALL');
  const [selectedDateItem, setSelectedDateItem] = useState<any | null>(null);
  const [dateModalReason, setDateModalReason] = useState<string>('PERSONAL_LEAVE');
  const [dateModalNotes, setDateModalNotes] = useState<string>('');
  const [dateModalServiceId, setDateModalServiceId] = useState<string>('ALL');
  const [showBatchBlockModal, setShowBatchBlockModal] = useState(false);
  const [batchStartDate, setBatchStartDate] = useState('');
  const [batchEndDate, setBatchEndDate] = useState('');
  const [batchReason, setBatchReason] = useState('PERSONAL_LEAVE');
  const [batchNotes, setBatchNotes] = useState('');
  const [batchServiceId, setBatchServiceId] = useState('ALL');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [calendarActionErr, setCalendarActionErr] = useState<string | null>(null);

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
      const authRes = await fetch('/api/auth/me', { credentials: 'include' });
      const authData = await authRes.json();
      if (!authData.authenticated) {
        setAuthNeeded(true);
        setLoading(false);
        return;
      }
      if (authData.user?.role !== 'VENDOR') {
        router.replace(homePathForRole(authData.user?.role));
        return;
      }

      setAuthNeeded(false);

      // Load parallel vendor data without blocking UI
      Promise.all([
        loadVendorOverview(),
        loadBusinessProfileData(),
        loadOnboardingAndDocs(),
        loadPackagesAndServices(),
        loadBookings(),
        loadAvailability(),
        loadPortfoliosAndReels(),
      ]).catch(err => console.error('Error loading vendor data:', err));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadVendorOverview = async (
    period: string = earningsPeriod,
    fromDate: string = earningsFromDate,
    toDate: string = earningsToDate
  ) => {
    setLoadingEarnings(true);
    try {
      const queryParams = new URLSearchParams();
      if (period) queryParams.set('period', period);
      if (period === 'CUSTOM') {
        if (fromDate) queryParams.set('from_date', fromDate);
        if (toDate) queryParams.set('to_date', toDate);
      }

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const [eRes, pRes] = await Promise.all([
        fetch(`/api/vendor/earnings${queryString}`),
        fetch(`/api/vendor/performance${queryString}`),
      ]);

      const [eData, pData] = await Promise.all([eRes.json(), pRes.json()]);

      if (eData.success) {
        setEarnings(eData.data);
      }
      if (pData.success) {
        setPerformanceData(pData.data);
      }
    } catch (err: any) {
      console.error('Failed to load earnings or performance data', err);
    } finally {
      setLoadingEarnings(false);
    }
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
      const [pRes, sRes, aRes] = await Promise.all([
        fetch('/api/vendor/packages'),
        fetch('/api/vendor/services'),
        fetch('/api/vendor/add-ons'),
      ]);
      const [pData, sData, aData] = await Promise.all([pRes.json(), sRes.json(), aRes.json()]);
      if (pData.success && Array.isArray(pData.data)) setPackages(pData.data);
      if (sData.success && Array.isArray(sData.data)) setServices(sData.data);
      if (aData.success && Array.isArray(aData.data)) setAddOns(aData.data);
    } catch (err) {
      console.error('Failed to load packages, services and add-ons:', err);
    }
  };

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success) setBookings(data.data);
    } catch {}
  };

  const loadAvailability = async (month = calendarMonth, serviceId = calendarServiceId) => {
    try {
      const res = await fetch(`/api/vendor/availability?month=${month}&service_id=${serviceId}`);
      const data = await res.json();
      if (data.success) setAvailability(data.data);
    } catch (err) {
      console.error('Failed to load vendor availability:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'calendar') {
      loadAvailability(calendarMonth, calendarServiceId);
    }
  }, [calendarMonth, calendarServiceId, activeTab]);

  const loadPortfoliosAndReels = async () => {
    try {
      const [pfRes, rlRes] = await Promise.all([
        fetch('/api/vendor/portfolio'),
        fetch('/api/vendor/reels'),
      ]);
      const [pfData, rlData] = await Promise.all([
        pfRes.json(),
        rlRes.json(),
      ]);
      if (pfData.success) {
        setPortfolios(pfData.data || []);
        if (pfData.storage_stats) {
          setPortfolioStats(pfData.storage_stats);
        }
      }
      if (rlData.success) {
        setReels(rlData.data || []);
      }
    } catch (err) {
      console.error('Error loading portfolio and reels:', err);
    }
  };

  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  const handleUpdateStatus = async (bookingId: string, status: string, reason?: string) => {
    try {
      let endpoint = `/api/bookings/${bookingId}/status`;
      let payload: any = { status, reason };

      // Intercept cancellation requests and use the new authoritative Cancellation API
      if (status === 'CANCELLED') {
        endpoint = '/api/cancellations/execute';
        payload = { booking_id: bookingId, reason };
      }

      const res = await fetch(endpoint, {
        method: status === 'CANCELLED' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Booking status updated to ${status}`);
        await Promise.all([loadBookings(), loadVendorOverview()]);
        if (selectedBookingDetail && selectedBookingDetail.id === bookingId) {
          handleOpenBookingDetail(bookingId);
        }
      } else {
        setError(data.message || 'Failed to update booking status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update booking status');
    }
  };

  const handleOpenBookingDetail = async (bookingId: string) => {
    setLoadingBookingDetail(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedBookingDetail(data.data);
      } else {
        setError(data.message || 'Failed to load booking details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoadingBookingDetail(false);
    }
  };

  const handleCloseBookingDetail = () => {
    setSelectedBookingDetail(null);
  };

  const handleOpenDeclineModal = (booking: any) => {
    setDeclineBookingModalItem(booking);
    setDeclineReason('Date unavailable / Fully committed');
    setDeclineCustomNote('');
  };

  const handleConfirmDecline = async () => {
    if (!declineBookingModalItem) return;
    setSubmittingDecline(true);
    try {
      const fullReason = declineCustomNote.trim()
        ? `${declineReason}: ${declineCustomNote.trim()}`
        : declineReason;
      await handleUpdateStatus(declineBookingModalItem.id, 'REJECTED', fullReason);
      setDeclineBookingModalItem(null);
      setDeclineCustomNote('');
    } finally {
      setSubmittingDecline(false);
    }
  };

  const handleOpenBookingChat = async (booking: any) => {
    setChatModalBooking(booking);
    setChatMessages([]);
    setChatNewMessage('');
    setChatError(null);
    setLoadingChat(true);
    try {
      const res = await fetch(`/api/messages?booking_id=${booking.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setChatMessages(data.data.messages || []);
      } else {
        setChatError(data.message || 'Failed to load messages');
      }
    } catch (err: any) {
      setChatError(err.message || 'Failed to connect to messaging server');
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendBookingChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatModalBooking || !chatNewMessage.trim() || sendingChatMessage) return;
    setSendingChatMessage(true);
    setChatError(null);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: chatModalBooking.id,
          body: chatNewMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setChatMessages(prev => [...prev, data.data]);
        setChatNewMessage('');
      } else {
        setChatError(data.message || 'Failed to send message');
      }
    } catch (err: any) {
      setChatError(err.message || 'Failed to send message');
    } finally {
      setSendingChatMessage(false);
    }
  };

  // Open Service Packages & Add-ons Modal
  const handleOpenServicePackagesModal = (srv: any) => {
    setServicePackagesModalSrv(srv);
    setSrvPackagesActiveTab('packages');
  };

  // Open Add/Edit Package Modal
  const handleOpenAddPackage = (serviceId?: string) => {
    setEditingPackage(null);
    setPkgName('');
    setPkgTier('STANDARD');
    setPkgPrice('50000');
    setPkgGuestCapacity('200');
    setPkgDescription('');
    setPkgInclusions('');
    setPkgServiceId(serviceId || servicePackagesModalSrv?.id || (services.length > 0 ? services[0].id : ''));
    setPkgIsActive(true);
    setPkgActionErr(null);
    setShowPackageModal(true);
  };

  const handleOpenEditPackage = (pkg: any) => {
    setEditingPackage(pkg);
    setPkgName(pkg.name || '');
    setPkgTier(pkg.package_tier || 'STANDARD');
    setPkgPrice(pkg.price !== undefined ? pkg.price.toString() : '');
    setPkgGuestCapacity(pkg.guest_capacity !== undefined ? pkg.guest_capacity.toString() : '200');
    setPkgDescription(pkg.description || '');
    const inc = Array.isArray(pkg.included_items)
      ? pkg.included_items.join(', ')
      : (typeof pkg.included_items_json === 'string' ? JSON.parse(pkg.included_items_json || '[]').join(', ') : '');
    setPkgInclusions(inc);
    setPkgServiceId(pkg.service_id || servicePackagesModalSrv?.id || (services.length > 0 ? services[0].id : ''));
    setPkgIsActive(pkg.is_active !== undefined ? Boolean(pkg.is_active) : true);
    setPkgActionErr(null);
    setShowPackageModal(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) {
      setPkgActionErr('Package name is required.');
      return;
    }
    const priceNum = parseFloat(pkgPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setPkgActionErr('Valid non-negative price is required.');
      return;
    }
    if (!pkgServiceId) {
      setPkgActionErr('Please associate this package with a wedding service.');
      return;
    }

    setSavingPackage(true);
    setPkgActionErr(null);
    try {
      const inclusionsArr = pkgInclusions.split(',').map((s) => s.trim()).filter(Boolean);

      if (editingPackage) {
        // PUT
        const res = await fetch('/api/vendor/packages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPackage.id,
            name: pkgName.trim(),
            package_tier: pkgTier,
            service_id: pkgServiceId,
            price: priceNum,
            guest_capacity: parseInt(pkgGuestCapacity, 10) || 200,
            description: pkgDescription.trim(),
            included_items: inclusionsArr,
            is_active: pkgIsActive,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Package "${pkgName.trim()}" updated successfully.`);
          setShowPackageModal(false);
          await loadPackagesAndServices();
        } else {
          setPkgActionErr(data.message || 'Failed to update package');
        }
      } else {
        // POST
        const res = await fetch('/api/vendor/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pkgName.trim(),
            package_tier: pkgTier,
            service_id: pkgServiceId,
            price: priceNum,
            guest_capacity: parseInt(pkgGuestCapacity, 10) || 200,
            description: pkgDescription.trim(),
            included_items: inclusionsArr,
            is_active: pkgIsActive,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Package "${pkgName.trim()}" created and submitted for admin review.`);
          setShowPackageModal(false);
          await loadPackagesAndServices();
        } else {
          setPkgActionErr(data.message || 'Failed to create package');
        }
      }
    } catch (err: any) {
      setPkgActionErr(err.message || 'Network error saving package');
    } finally {
      setSavingPackage(false);
    }
  };

  const handleTogglePackageActive = async (pkg: any) => {
    try {
      const res = await fetch('/api/vendor/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pkg.id,
          is_active: !pkg.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Package "${pkg.name}" is now ${!pkg.is_active ? 'Active' : 'Paused'}.`);
        loadPackagesAndServices();
      } else {
        setError(data.message || 'Failed to toggle package active state');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePackage = async (id: string, name?: string) => {
    if (!confirm(`Are you sure you want to permanently delete the package "${name || 'Selected Package'}"?`)) return;
    try {
      const res = await fetch(`/api/vendor/packages?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Package deleted successfully');
        loadPackagesAndServices();
      } else {
        setError(data.message || 'Failed to delete package');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add-on Handlers
  const handleOpenAddAddOn = (serviceId?: string, packageId?: string) => {
    setEditingAddOn(null);
    setAddonName('');
    setAddonPrice('5000');
    setAddonDescription('');
    setAddonServiceId(serviceId || servicePackagesModalSrv?.id || '');
    setAddonPackageId(packageId || '');
    setAddonIsActive(true);
    setAddonActionErr(null);
    setShowAddOnModal(true);
  };

  const handleOpenEditAddOn = (addon: any) => {
    setEditingAddOn(addon);
    setAddonName(addon.name || '');
    setAddonPrice(addon.price !== undefined ? addon.price.toString() : '0');
    setAddonDescription(addon.description || '');
    setAddonServiceId(addon.service_id || '');
    setAddonPackageId(addon.package_id || '');
    setAddonIsActive(addon.is_active !== undefined ? Boolean(addon.is_active) : true);
    setAddonActionErr(null);
    setShowAddOnModal(true);
  };

  const handleSaveAddOn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addonName.trim()) {
      setAddonActionErr('Add-on name is required');
      return;
    }
    const priceNum = parseFloat(addonPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setAddonActionErr('Price must be a valid non-negative number');
      return;
    }

    setSavingAddOn(true);
    setAddonActionErr(null);
    try {
      if (editingAddOn) {
        const res = await fetch('/api/vendor/add-ons', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingAddOn.id,
            name: addonName.trim(),
            description: addonDescription.trim(),
            price: priceNum,
            service_id: addonServiceId || null,
            package_id: addonPackageId || null,
            is_active: addonIsActive,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Add-on "${addonName.trim()}" updated successfully.`);
          setShowAddOnModal(false);
          await loadPackagesAndServices();
        } else {
          setAddonActionErr(data.message || 'Failed to update add-on');
        }
      } else {
        const res = await fetch('/api/vendor/add-ons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: addonName.trim(),
            description: addonDescription.trim(),
            price: priceNum,
            service_id: addonServiceId || null,
            package_id: addonPackageId || null,
            is_active: addonIsActive,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Add-on "${addonName.trim()}" created successfully.`);
          setShowAddOnModal(false);
          await loadPackagesAndServices();
        } else {
          setAddonActionErr(data.message || 'Failed to create add-on');
        }
      }
    } catch (err: any) {
      setAddonActionErr(err.message || 'Network error saving add-on');
    } finally {
      setSavingAddOn(false);
    }
  };

  const handleToggleAddOnActive = async (addon: any) => {
    try {
      const res = await fetch('/api/vendor/add-ons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: addon.id,
          is_active: !addon.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Add-on "${addon.name}" is now ${!addon.is_active ? 'Active' : 'Inactive'}.`);
        loadPackagesAndServices();
      } else {
        setError(data.message || 'Failed to toggle add-on status');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAddOn = async (id: string, name?: string) => {
    if (!confirm(`Are you sure you want to remove the add-on "${name || 'Selected Add-on'}"?`)) return;
    try {
      const res = await fetch(`/api/vendor/add-ons?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Add-on deleted successfully');
        loadPackagesAndServices();
      } else {
        setError(data.message || 'Failed to delete add-on');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenComparisonPreview = (serviceId?: string) => {
    setComparisonServiceId(serviceId);
    setShowComparisonModal(true);
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

  const handleMonthNav = (direction: 'prev' | 'next') => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + (direction === 'next' ? 1 : -1), 1));
    const nextY = date.getUTCFullYear();
    const nextM = String(date.getUTCMonth() + 1).padStart(2, '0');
    setCalendarMonth(`${nextY}-${nextM}`);
  };

  const handleJumpToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    setCalendarMonth(`${y}-${m}`);
  };

  const handleOpenDateModal = (dateStr: string) => {
    const item = availability?.calendar_dates?.[dateStr] || { date: dateStr, status: 'AVAILABLE', can_unblock: false };
    setSelectedDateItem(item);
    setDateModalReason(item.reason || 'PERSONAL_LEAVE');
    setDateModalNotes(item.notes || '');
    setDateModalServiceId(item.service_id || calendarServiceId || 'ALL');
    setCalendarActionErr(null);
  };

  const handleSaveDateStatus = async (status: 'BLOCKED' | 'AVAILABLE') => {
    if (!selectedDateItem) return;
    setSavingAvailability(true);
    setCalendarActionErr(null);
    try {
      const res = await fetch('/api/vendor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDateItem.date,
          status,
          is_booked: status === 'BLOCKED',
          reason: dateModalReason,
          notes: dateModalNotes,
          service_id: dateModalServiceId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setSelectedDateItem(null);
        loadAvailability(calendarMonth, calendarServiceId);
      } else {
        setCalendarActionErr(data.message || 'Failed to update date availability');
      }
    } catch (err: any) {
      setCalendarActionErr(err.message);
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleDirectUnblockDate = async (dateStr: string, serviceId = 'ALL') => {
    setSavingAvailability(true);
    setCalendarActionErr(null);
    try {
      const res = await fetch(`/api/vendor/availability?date=${dateStr}&service_id=${serviceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        if (selectedDateItem?.date === dateStr) {
          setSelectedDateItem(null);
        }
        loadAvailability(calendarMonth, calendarServiceId);
      } else {
        setCalendarActionErr(data.message);
      }
    } catch (err: any) {
      setCalendarActionErr(err.message);
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleSubmitBatchBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchStartDate || !batchEndDate) {
      setCalendarActionErr('Please select both start date and end date');
      return;
    }
    setSavingAvailability(true);
    setCalendarActionErr(null);
    try {
      const res = await fetch('/api/vendor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: batchStartDate,
          end_date: batchEndDate,
          status: 'BLOCKED',
          is_booked: true,
          reason: batchReason,
          notes: batchNotes,
          service_id: batchServiceId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setShowBatchBlockModal(false);
        setBatchStartDate('');
        setBatchEndDate('');
        setBatchNotes('');
        loadAvailability(calendarMonth, calendarServiceId);
      } else {
        setCalendarActionErr(data.message || 'Failed to block dates');
      }
    } catch (err: any) {
      setCalendarActionErr(err.message);
    } finally {
      setSavingAvailability(false);
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

  const handleOpenUploadModal = (type: 'IMAGE' | 'VIDEO' = 'IMAGE') => {
    setUploadMediaType(type);
    setUploadFile(null);
    setUploadPreviewUrl(null);
    setUploadThumbnailFile(null);
    setUploadThumbnailPreviewUrl(null);
    setUploadTitle('');
    setUploadCaption('');
    setUploadDescription('');
    setUploadServiceId(services.length > 0 ? services[0].id : '');
    setUploadIsCover(type === 'IMAGE' && portfolios.length === 0);
    setUploadError(null);
    setUploadSuccess(null);
    setShowUploadModal(true);
  };

  const handlePortfolioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isVid = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov') || file.name.endsWith('.webm');
      setUploadMediaType(isVid ? 'VIDEO' : 'IMAGE');
      setUploadFile(file);
      const url = URL.createObjectURL(file);
      setUploadPreviewUrl(url);
      if (!uploadTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setUploadTitle(cleanName);
      }
    }
  };

  const handleThumbnailFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadThumbnailFile(file);
      const url = URL.createObjectURL(file);
      setUploadThumbnailPreviewUrl(url);
    }
  };

  const handleSubmitPortfolioUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);

    if (!uploadFile) {
      setUploadError('Please select a wedding photo or video file to upload.');
      return;
    }

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('media_type', uploadMediaType);
      if (uploadTitle) formData.append('title', uploadTitle);
      if (uploadCaption) formData.append('caption', uploadCaption);
      if (uploadDescription) formData.append('description', uploadDescription);
      if (uploadServiceId) formData.append('service_id', uploadServiceId);
      formData.append('is_cover', uploadIsCover ? 'true' : 'false');
      if (uploadThumbnailFile) formData.append('thumbnail', uploadThumbnailFile);

      const res = await fetch('/api/vendor/portfolio', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUploadSuccess('🎉 Media uploaded successfully and submitted for moderation review!');
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadSuccess(null);
          loadPortfoliosAndReels();
        }, 1200);
      } else {
        setUploadError(data.message || 'Failed to upload media. Please check file size and format.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Network error during upload');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDeletePortfolioItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently delete this portfolio item?')) return;
    setDeletingMediaId(itemId);
    try {
      const res = await fetch(`/api/vendor/portfolio?id=${itemId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPortfolios(prev => prev.filter((p: any) => p.id !== itemId));
        if (selectedPreviewMedia?.id === itemId) {
          setSelectedPreviewMedia(null);
        }
        loadPortfoliosAndReels();
      } else {
        alert(data.message || 'Failed to delete portfolio media');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting media');
    } finally {
      setDeletingMediaId(null);
    }
  };

  const handleSetCoverPhoto = async (itemId: string) => {
    try {
      const res = await fetch('/api/vendor/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, is_cover: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPortfolios(prev =>
          prev.map((p: any) => ({
            ...p,
            is_cover: p.id === itemId,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to set cover photo:', err);
    }
  };

  const handleToggleMediaActive = async (item: any) => {
    try {
      const nextActive = !item.is_active;
      const res = await fetch('/api/vendor/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_active: nextActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPortfolios(prev =>
          prev.map((p: any) => (p.id === item.id ? { ...p, is_active: nextActive } : p))
        );
      }
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
  };

  if (loading && !vendorData) {
    return (
      <div style={{ minHeight: '100vh', background: '#03140e', color: '#9cb1a6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Checking your account…
      </div>
    );
  }

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
            { id: 'overview', label: 'Earnings & Performance', icon: '📊' },
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
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
              window.location.assign('/');
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
              <div style={{ background: '#061d15', border: '1px solid rgba(229,193,88,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff', margin: 0 }}>{vendorData?.business_name || 'Vendor Partner'}</h1>
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
                  <p style={{ color: '#a0aec0', fontSize: '14px', marginTop: '6px', marginBottom: 0 }}>
                    {vendorData?.city || 'India'} • Base starting price: <strong style={{ color: '#e5c158' }}>₹{parseFloat(vendorData?.starting_price || 15000).toLocaleString('en-IN')}</strong>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e5c158' }}>★ {performanceData?.reviews_summary?.average_rating || vendorData?.rating || '5.0'}</div>
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>{performanceData?.reviews_summary?.total_reviews ?? (vendorData?.review_count || 0)} verified customer reviews</div>
                </div>
              </div>

              {/* Period Filter Bar */}
              <div style={{
                background: '#072218',
                border: '1px solid rgba(229,193,88,0.2)',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '28px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5c158', marginRight: '6px' }}>
                    📅 Filter Period:
                  </span>
                  {[
                    { id: 'ALL', label: 'All Time' },
                    { id: 'THIS_MONTH', label: 'This Month' },
                    { id: 'LAST_MONTH', label: 'Last Month' },
                    { id: 'THIS_YEAR', label: 'This Year' },
                    { id: 'CUSTOM', label: 'Custom Range' },
                  ].map((p) => {
                    const isSelected = earningsPeriod === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setEarningsPeriod(p.id as any);
                          if (p.id !== 'CUSTOM') {
                            loadVendorOverview(p.id, '', '');
                          }
                        }}
                        style={{
                          background: isSelected ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'rgba(255,255,255,0.06)',
                          color: isSelected ? '#fff' : '#cbd5e0',
                          border: isSelected ? '1px solid #e6005c' : '1px solid rgba(229,193,88,0.15)',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {earningsPeriod === 'CUSTOM' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="date"
                        value={earningsFromDate}
                        onChange={(e) => setEarningsFromDate(e.target.value)}
                        placeholder="From"
                        style={{
                          background: '#031710',
                          border: '1px solid rgba(229,193,88,0.3)',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <span style={{ color: '#a0aec0', fontSize: '12px' }}>to</span>
                      <input
                        type="date"
                        value={earningsToDate}
                        onChange={(e) => setEarningsToDate(e.target.value)}
                        placeholder="To"
                        style={{
                          background: '#031710',
                          border: '1px solid rgba(229,193,88,0.3)',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => loadVendorOverview('CUSTOM', earningsFromDate, earningsToDate)}
                        style={{
                          background: '#e5c158',
                          color: '#031710',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => loadVendorOverview(earningsPeriod, earningsFromDate, earningsToDate)}
                    disabled={loadingEarnings}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: '#e5c158',
                      border: '1px solid rgba(229,193,88,0.3)',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{loadingEarnings ? '⌛' : '↻'}</span>
                    {loadingEarnings ? 'Refreshing...' : 'Refresh Financials'}
                  </button>
                </div>
              </div>

              {/* 4 Primary Financial KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div style={{ background: '#072218', padding: '22px', borderRadius: '14px', border: '1px solid rgba(229,193,88,0.25)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#a0aec0', fontWeight: 600 }}>Gross Bookings Volume</div>
                    <span style={{ fontSize: '18px' }}>💰</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', marginTop: '8px' }}>
                    ₹{parseFloat(earnings?.summary?.gross_revenue ?? earnings?.gross_revenue ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '6px' }}>
                    From <strong>{earnings?.summary?.total_bookings_volume ?? earnings?.itemized_bookings?.length ?? 0}</strong> confirmed / completed orders
                  </div>
                </div>

                <div style={{ background: '#072218', padding: '22px', borderRadius: '14px', border: '1px solid rgba(229,193,88,0.25)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#a0aec0', fontWeight: 600 }}>Platform Commission (10%)</div>
                    <span style={{ fontSize: '18px' }}>🏷️</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ed8936', marginTop: '8px' }}>
                    ₹{parseFloat(earnings?.summary?.commission_deducted ?? earnings?.total_commission ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '6px' }}>
                    Calculated automatically at standard 10% platform fee
                  </div>
                </div>

                <div style={{ background: '#072218', padding: '22px', borderRadius: '14px', border: '1px solid rgba(56,161,105,0.4)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#9ae6b4', fontWeight: 600 }}>Net Vendor Payable</div>
                    <span style={{ fontSize: '18px' }}>✨</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#38a169', marginTop: '8px' }}>
                    ₹{parseFloat(earnings?.summary?.net_vendor_earnings ?? earnings?.net_vendor_earnings ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#48bb78', marginTop: '6px' }}>
                    Net receivable across all eligible wedding bookings
                  </div>
                </div>

                <div style={{ background: '#072218', padding: '22px', borderRadius: '14px', border: '1px solid rgba(229,193,88,0.4)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#e5c158', fontWeight: 600 }}>Paid Out Settlements</div>
                    <span style={{ fontSize: '18px' }}>🏦</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e5c158', marginTop: '8px' }}>
                    ₹{parseFloat(earnings?.summary?.settled_earnings ?? earnings?.paid_payouts ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '6px' }}>
                    Disbursed directly to your registered bank account
                  </div>
                </div>
              </div>

              {/* Secondary Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div style={{ background: '#051b13', padding: '16px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>⏳ Pending Settlement</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ed8936', marginTop: '4px' }}>
                    ₹{parseFloat(earnings?.summary?.pending_settlement ?? earnings?.pending_payouts ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Completed events awaiting payout</div>
                </div>

                <div style={{ background: '#051b13', padding: '16px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>🔒 Escrow Held (Confirmed)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4299e1', marginTop: '4px' }}>
                    ₹{parseFloat(earnings?.summary?.escrow_held_earnings ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Locked until event completion</div>
                </div>

                <div style={{ background: '#051b13', padding: '16px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>📩 Inquiries / Pipeline</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#cbd5e0', marginTop: '4px' }}>
                    ₹{parseFloat(earnings?.summary?.pipeline_requested_volume ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Open requested bookings</div>
                </div>

                <div style={{ background: '#051b13', padding: '16px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>🎯 Average Order Value (AOV)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e5c158', marginTop: '4px' }}>
                    ₹{parseFloat(earnings?.summary?.average_order_value ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Average revenue per booking</div>
                </div>
              </div>

              {/* Registered Bank Settlement Account Info Bar */}
              <div style={{
                background: '#041710',
                border: '1px solid rgba(229,193,88,0.2)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '22px' }}>🏛️</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
                      Settlement Beneficiary Account: {earnings?.bank_info?.account_number_masked || (bankAccount ? `•••• •••• ${bankAccount.slice(-4)}` : 'No bank account configured')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                      IFSC: <span style={{ color: '#e5c158', fontFamily: 'monospace' }}>{earnings?.bank_info?.ifsc_code || bankIfsc || 'N/A'}</span> • Automated Direct NEFT/IMPS Clearing
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('onboarding')}
                  style={{
                    background: 'rgba(229,193,88,0.12)',
                    color: '#e5c158',
                    border: '1px solid rgba(229,193,88,0.3)',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Manage Bank Info →
                </button>
              </div>

              {/* Sub-Navigation Switcher */}
              <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid rgba(229,193,88,0.2)',
                paddingBottom: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap',
              }}>
                <button
                  type="button"
                  onClick={() => setActiveEarningsSubTab('financials')}
                  style={{
                    background: activeEarningsSubTab === 'financials' ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
                    color: activeEarningsSubTab === 'financials' ? '#fff' : '#cbd5e0',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📊</span> Financial Statement & Bookings ({earnings?.itemized_bookings?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveEarningsSubTab('settlements')}
                  style={{
                    background: activeEarningsSubTab === 'settlements' ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
                    color: activeEarningsSubTab === 'settlements' ? '#fff' : '#cbd5e0',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🏦</span> Settlement & Payout Ledger ({earnings?.recent_payouts?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveEarningsSubTab('performance')}
                  style={{
                    background: activeEarningsSubTab === 'performance' ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
                    color: activeEarningsSubTab === 'performance' ? '#fff' : '#cbd5e0',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📈</span> Storefront & Performance Analytics
                </button>
              </div>

              {/* SUB-TAB 1: FINANCIAL STATEMENT & ITEMIZE BREAKDOWN */}
              {activeEarningsSubTab === 'financials' && (
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>Itemized Booking Financial Statement</h2>
                      <p style={{ fontSize: '12px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                        Breakdown of client order totals, 10% platform commission, and net vendor payable per event.
                      </p>
                    </div>
                  </div>

                  {(!earnings?.itemized_bookings || earnings.itemized_bookings.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#a0aec0' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧾</div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>No Bookings in this Period</div>
                      <p style={{ fontSize: '13px', maxWidth: '460px', margin: '6px auto 0 auto' }}>
                        No booking records match the selected date filter. As upcoming weddings are confirmed or completed, their itemized statements will appear here.
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: '#0a271c', color: '#e5c158', textAlign: 'left' }}>
                            <th style={{ padding: '12px 14px' }}>Booking #</th>
                            <th style={{ padding: '12px 14px' }}>Customer & Service</th>
                            <th style={{ padding: '12px 14px' }}>Event Date</th>
                            <th style={{ padding: '12px 14px' }}>Booking Status</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Gross Total</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Platform Fee (10%)</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Net Payable</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center' }}>Settlement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {earnings.itemized_bookings.map((b: any) => {
                            const isPaid = b.settlement_status === 'PAID';
                            const isPending = b.settlement_status === 'PENDING';
                            return (
                              <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#e5c158', fontWeight: 'bold' }}>
                                  {b.booking_number}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ fontWeight: 600, color: '#fff' }}>{b.customer_name}</div>
                                  <div style={{ fontSize: '11px', color: '#a0aec0' }}>{b.service_title} {b.package_name ? `(${b.package_name})` : ''}</div>
                                </td>
                                <td style={{ padding: '12px 14px', color: '#cbd5e0' }}>
                                  {b.event_date ? new Date(b.event_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{
                                    padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                    background: b.status === 'COMPLETED' ? 'rgba(56,161,105,0.2)' : b.status === 'CONFIRMED' ? 'rgba(66,153,225,0.2)' : b.status === 'CANCELLED' ? 'rgba(230,0,92,0.2)' : 'rgba(237,137,54,0.2)',
                                    color: b.status === 'COMPLETED' ? '#48bb78' : b.status === 'CONFIRMED' ? '#63b3ed' : b.status === 'CANCELLED' ? '#ff6b9d' : '#ed8936',
                                  }}>
                                    {b.status}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#fff' }}>
                                  ₹{parseFloat(b.gross_amount || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#ed8936' }}>
                                  -₹{parseFloat(b.commission_amount || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 'bold', color: '#48bb78' }}>
                                  ₹{parseFloat(b.net_vendor_payout || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                    background: isPaid ? 'rgba(56,161,105,0.2)' : isPending ? 'rgba(237,137,54,0.2)' : 'rgba(255,255,255,0.06)',
                                    color: isPaid ? '#48bb78' : isPending ? '#ed8936' : '#a0aec0',
                                  }}>
                                    {b.settlement_status || (b.status === 'CONFIRMED' ? 'ESCROW HELD' : 'N/A')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 2: SETTLEMENT & PAYOUT LEDGER */}
              {activeEarningsSubTab === 'settlements' && (
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>Settlement Payout History</h2>
                      <p style={{ fontSize: '12px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                        Real database record of bank payouts scheduled and cleared upon event completion.
                      </p>
                    </div>
                  </div>

                  {(!earnings?.recent_payouts || earnings.recent_payouts.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#a0aec0' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏦</div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>No Settlements Generated Yet</div>
                      <p style={{ fontSize: '13px', maxWidth: '460px', margin: '6px auto 0 auto' }}>
                        Payout settlements trigger automatically when a wedding booking transitions to COMPLETED. Completed payouts are cleared to your verified bank account.
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: '#0a271c', color: '#e5c158', textAlign: 'left' }}>
                            <th style={{ padding: '12px 14px' }}>Payout Ref</th>
                            <th style={{ padding: '12px 14px' }}>Booking #</th>
                            <th style={{ padding: '12px 14px' }}>Event Date</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Order</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Net Disbursed</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center' }}>Payout Status</th>
                            <th style={{ padding: '12px 14px' }}>Created Date</th>
                            <th style={{ padding: '12px 14px' }}>Settled Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {earnings.recent_payouts.map((p: any) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <td style={{ padding: '12px 14px', color: '#e5c158', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                {p.reference_id}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#cbd5e0' }}>{p.booking_number || 'N/A'}</td>
                              <td style={{ padding: '12px 14px', color: '#a0aec0' }}>
                                {p.event_date ? new Date(p.event_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', color: '#fff' }}>
                                ₹{parseFloat(p.total_booking_amount || 0).toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', color: '#48bb78', fontWeight: 'bold' }}>
                                ₹{parseFloat(p.amount).toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                  background: p.status === 'PAID' ? 'rgba(56,161,105,0.2)' : p.status === 'PROCESSING' ? 'rgba(66,153,225,0.2)' : p.status === 'FAILED' ? 'rgba(230,0,92,0.2)' : p.status === 'MANUAL_REVIEW' ? 'rgba(128,90,213,0.2)' : 'rgba(237,137,54,0.2)',
                                  color: p.status === 'PAID' ? '#48bb78' : p.status === 'PROCESSING' ? '#63b3ed' : p.status === 'FAILED' ? '#ff6b9d' : p.status === 'MANUAL_REVIEW' ? '#b794f4' : '#ed8936',
                                }}>
                                  {p.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#a0aec0' }}>
                                {new Date(p.created_at).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#a0aec0' }}>
                                {p.payout_date ? new Date(p.payout_date).toLocaleDateString() : 'Pending Clearance'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 3: STOREFRONT & PERFORMANCE ANALYTICS */}
              {activeEarningsSubTab === 'performance' && (
                <div>
                  {/* Conversion Funnel Overview */}
                  <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '6px' }}>Storefront Engagement & Funnel</h2>
                    <p style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '20px' }}>
                      Real-time client funnel tracked across profile traffic, inquiries, bookings and fulfilled events.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div style={{ background: '#072218', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>👁️ Profile Views</div>
                        <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff', marginTop: '6px' }}>
                          {performanceData?.metrics?.profile_views ?? 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Couples discovering your profile</div>
                      </div>

                      <div style={{ background: '#072218', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>💌 Inquiries & Leads</div>
                        <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#63b3ed', marginTop: '6px' }}>
                          {performanceData?.metrics?.inquiries_count ?? 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Total client requests received</div>
                      </div>

                      <div style={{ background: '#072218', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>🤝 Confirmed Orders</div>
                        <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#e5c158', marginTop: '6px' }}>
                          {performanceData?.metrics?.confirmed_bookings_count ?? 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Bookings confirmed / locked</div>
                      </div>

                      <div style={{ background: '#072218', padding: '18px', borderRadius: '12px', border: '1px solid rgba(56,161,105,0.3)' }}>
                        <div style={{ fontSize: '12px', color: '#9ae6b4' }}>🏆 Completed Weddings</div>
                        <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#38a169', marginTop: '6px' }}>
                          {performanceData?.metrics?.completed_bookings_count ?? 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#48bb78', marginTop: '2px' }}>Successfully fulfilled weddings</div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Ratios Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Booking Conversion Rate</div>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#48bb78' }}>{performanceData?.metrics?.conversion_rate ?? 0}%</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '6px', height: '8px', overflow: 'hidden', marginTop: '12px' }}>
                        <div style={{ width: `${Math.min(100, performanceData?.metrics?.conversion_rate ?? 0)}%`, height: '100%', background: '#48bb78' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
                        Ratio of inquiries converted to confirmed or completed bookings
                      </div>
                    </div>

                    <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Fulfillment Completion Rate</div>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#38a169' }}>{performanceData?.metrics?.completion_rate ?? 0}%</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '6px', height: '8px', overflow: 'hidden', marginTop: '12px' }}>
                        <div style={{ width: `${Math.min(100, performanceData?.metrics?.completion_rate ?? 0)}%`, height: '100%', background: '#38a169' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
                        Share of confirmed bookings successfully completed
                      </div>
                    </div>

                    <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Cancellation Rate</div>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff6b9d' }}>{performanceData?.metrics?.cancellation_rate ?? 0}%</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '6px', height: '8px', overflow: 'hidden', marginTop: '12px' }}>
                        <div style={{ width: `${Math.min(100, performanceData?.metrics?.cancellation_rate ?? 0)}%`, height: '100%', background: '#e6005c' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
                        Share of total bookings cancelled
                      </div>
                    </div>
                  </div>

                  {/* Customer Reviews & Feedback Section */}
                  <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>Customer Reviews & Quality Ratings</h2>
                        <p style={{ fontSize: '12px', color: '#a0aec0', margin: '4px 0 0 0' }}>
                          Verified client reviews submitted post-wedding event completion.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e5c158' }}>★ {performanceData?.reviews_summary?.average_rating || '5.0'}</div>
                        <div style={{ fontSize: '12px', color: '#cbd5e0' }}>
                          <div>{performanceData?.reviews_summary?.total_reviews ?? 0} Reviews</div>
                          <div style={{ color: '#48bb78', fontWeight: 600 }}>100% Verified</div>
                        </div>
                      </div>
                    </div>

                    {/* Star Breakdown */}
                    {performanceData?.reviews_summary?.rating_distribution && (
                      <div style={{ background: '#041710', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
                        {[
                          { star: 5, count: performanceData.reviews_summary.rating_distribution['5_star'] || 0 },
                          { star: 4, count: performanceData.reviews_summary.rating_distribution['4_star'] || 0 },
                          { star: 3, count: performanceData.reviews_summary.rating_distribution['3_star'] || 0 },
                          { star: 2, count: performanceData.reviews_summary.rating_distribution['2_star'] || 0 },
                          { star: 1, count: performanceData.reviews_summary.rating_distribution['1_star'] || 0 },
                        ].map((s) => {
                          const total = performanceData?.reviews_summary?.total_reviews || 1;
                          const pct = Math.round((s.count / (total || 1)) * 100);
                          return (
                            <div key={s.star} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', fontSize: '12px' }}>
                              <span style={{ width: '40px', color: '#e5c158', fontWeight: 600 }}>{s.star} ★</span>
                              <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: '#e5c158' }} />
                              </div>
                              <span style={{ width: '50px', textAlign: 'right', color: '#a0aec0' }}>{s.count} ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Verified Reviews List */}
                    {(!performanceData?.reviews_summary?.recent_reviews || performanceData.reviews_summary.recent_reviews.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '30px 20px', color: '#a0aec0' }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>No Customer Reviews Yet</div>
                        <p style={{ fontSize: '12px', maxWidth: '420px', margin: '6px auto 0 auto' }}>
                          Verified wedding reviews submitted by couples upon completing their booking will appear here.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {performanceData.reviews_summary.recent_reviews.map((r: any) => (
                          <div key={r.id} style={{ background: '#041710', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>{r.customer_name || 'Verified Customer'}</span>
                                {r.is_verified_booking && (
                                  <span style={{ fontSize: '10px', background: 'rgba(56,161,105,0.2)', color: '#48bb78', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                    ✓ VERIFIED WEDDING
                                  </span>
                                )}
                              </div>
                              <div style={{ color: '#e5c158', fontSize: '13px', fontWeight: 'bold' }}>
                                {'★'.repeat(r.rating || 5)}{'☆'.repeat(Math.max(0, 5 - (r.rating || 5)))}
                              </div>
                            </div>
                            <p style={{ color: '#cbd5e0', fontSize: '13px', margin: 0 }}>
                              &ldquo;{r.comment}&rdquo;
                            </p>
                            <div style={{ fontSize: '11px', color: '#718096', marginTop: '6px' }}>
                              {new Date(r.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

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

                          {/* Manage Packages & Add-ons Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenServicePackagesModal(srv)}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, rgba(229,193,88,0.2) 0%, rgba(229,193,88,0.08) 100%)',
                              border: '1px solid rgba(229,193,88,0.4)',
                              color: '#e5c158',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '10px',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>📦</span> Manage Packages & Add-ons
                            </span>
                            <span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.35)', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                              {packages.filter((p: any) => p.service_id === srv.id).length} Tiers • {addOns.filter((a: any) => a.service_id === srv.id).length} Add-ons
                            </span>
                          </button>

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

              {/* ================= SERVICE PACKAGES & ADD-ONS MODAL ================= */}
              {servicePackagesModalSrv && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(3, 23, 16, 0.88)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 990,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                  }}
                  onClick={() => setServicePackagesModalSrv(null)}
                >
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #051e15 0%, #03140e 100%)',
                      border: '1px solid rgba(229, 193, 88, 0.35)',
                      borderRadius: '20px',
                      maxWidth: '1040px',
                      width: '100%',
                      maxHeight: '90vh',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
                      overflow: 'hidden',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(229,193,88,0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(4,25,18,0.6)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '22px' }}>📦</span>
                          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                            {servicePackagesModalSrv.title} — Packages & Add-ons
                          </h3>
                        </div>
                        <p style={{ fontSize: '13px', color: '#a0aec0', marginTop: '4px', marginBottom: 0 }}>
                          Category: {servicePackagesModalSrv.category_name || 'Wedding Service'} • Starting from ₹{parseFloat(servicePackagesModalSrv.starting_price || 0).toLocaleString('en-IN')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setServicePackagesModalSrv(null)}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#cbd5e0',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          fontSize: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Sub-tabs & Actions Bar */}
                    <div
                      style={{
                        padding: '14px 24px',
                        borderBottom: '1px solid rgba(229,193,88,0.15)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        background: '#041810',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSrvPackagesActiveTab('packages')}
                          style={{
                            padding: '8px 18px',
                            borderRadius: '8px',
                            border: 'none',
                            background: srvPackagesActiveTab === 'packages' ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>📦</span> Packages ({packages.filter((p: any) => p.service_id === servicePackagesModalSrv.id).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSrvPackagesActiveTab('addons')}
                          style={{
                            padding: '8px 18px',
                            borderRadius: '8px',
                            border: 'none',
                            background: srvPackagesActiveTab === 'addons' ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>✨</span> Optional Add-ons ({addOns.filter((a: any) => a.service_id === servicePackagesModalSrv.id).length})
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenComparisonPreview(servicePackagesModalSrv.id)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            background: 'rgba(229,193,88,0.15)',
                            border: '1px solid rgba(229,193,88,0.3)',
                            color: '#e5c158',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>👁️</span> Preview Comparison
                        </button>

                        {srvPackagesActiveTab === 'packages' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAddPackage(servicePackagesModalSrv.id)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                              color: '#fff',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                            }}
                          >
                            + Add New Package
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAddAddOn(servicePackagesModalSrv.id)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                              color: '#fff',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                            }}
                          >
                            + Add New Add-on
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Modal Scroll Content */}
                    <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                      {srvPackagesActiveTab === 'packages' ? (
                        <div>
                          {packages.filter((p: any) => p.service_id === servicePackagesModalSrv.id).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 16px', background: '#061d15', borderRadius: '16px', border: '1px dashed rgba(229,193,88,0.25)' }}>
                              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📦</div>
                              <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
                                No Packages Configured for This Service
                              </h4>
                              <p style={{ fontSize: '13px', color: '#a0aec0', maxWidth: '420px', margin: '0 auto 18px auto' }}>
                                Create structured packages (e.g. Basic, Standard, Premium) with prices, guest capacities, and inclusions.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenAddPackage(servicePackagesModalSrv.id)}
                                style={{
                                  padding: '10px 20px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                  color: '#fff',
                                  fontWeight: 'bold',
                                  fontSize: '13px',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                + Create First Package
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px' }}>
                              {packages
                                .filter((p: any) => p.service_id === servicePackagesModalSrv.id)
                                .map((pkg: any) => {
                                  const isApproved = pkg.moderation_status === 'APPROVED';
                                  const isPending = pkg.moderation_status === 'PENDING_REVIEW';
                                  const isRejected = pkg.moderation_status === 'REJECTED';

                                  return (
                                    <div
                                      key={pkg.id}
                                      style={{
                                        background: '#07241a',
                                        border: isRejected ? '1px solid rgba(245,101,101,0.4)' : '1px solid rgba(229,193,88,0.22)',
                                        borderRadius: '14px',
                                        padding: '18px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                      }}
                                    >
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                          <span
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 700,
                                              padding: '2px 8px',
                                              borderRadius: '6px',
                                              textTransform: 'uppercase',
                                              background: pkg.package_tier === 'PREMIUM'
                                                ? 'rgba(255,42,115,0.2)'
                                                : pkg.package_tier === 'BASIC'
                                                ? 'rgba(160,174,192,0.2)'
                                                : 'rgba(229,193,88,0.2)',
                                              color: pkg.package_tier === 'PREMIUM'
                                                ? '#ff80ab'
                                                : pkg.package_tier === 'BASIC'
                                                ? '#e2e8f0'
                                                : '#e5c158',
                                              border: '1px solid rgba(229,193,88,0.3)',
                                            }}
                                          >
                                            {pkg.package_tier || 'STANDARD'}
                                          </span>

                                          <span
                                            style={{
                                              fontSize: '10px',
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              fontWeight: 700,
                                              background: isApproved ? 'rgba(56,161,105,0.2)' : isPending ? 'rgba(237,137,54,0.2)' : 'rgba(245,101,101,0.2)',
                                              color: isApproved ? '#48bb78' : isPending ? '#ed8936' : '#f56565',
                                            }}
                                          >
                                            {pkg.moderation_status || 'APPROVED'}
                                          </span>
                                        </div>

                                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', margin: '0 0 6px 0' }}>
                                          {pkg.name}
                                        </h4>

                                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e5c158', marginBottom: '8px' }}>
                                          ₹{parseFloat(pkg.price || 0).toLocaleString('en-IN')}
                                        </div>

                                        <p style={{ fontSize: '12px', color: '#a0aec0', minHeight: '32px', marginBottom: '10px', lineHeight: '1.4' }}>
                                          {pkg.description || 'Full wedding package coverage.'}
                                        </p>

                                        <div style={{ fontSize: '11px', color: '#cbd5e0', marginBottom: '10px' }}>
                                          👥 Capacity: {pkg.guest_capacity || 200} guests
                                        </div>

                                        {/* Inclusions tags */}
                                        {pkg.included_items && pkg.included_items.length > 0 && (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                                            {pkg.included_items.slice(0, 4).map((inc: string, idx: number) => (
                                              <span key={idx} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e0', padding: '2px 6px', borderRadius: '4px' }}>
                                                ✓ {inc}
                                              </span>
                                            ))}
                                            {pkg.included_items.length > 4 && (
                                              <span style={{ fontSize: '10px', color: '#e5c158', padding: '2px 4px' }}>
                                                +{pkg.included_items.length - 4} more
                                              </span>
                                            )}
                                          </div>
                                        )}

                                        {isRejected && pkg.rejection_reason && (
                                          <div style={{ background: 'rgba(245,101,101,0.12)', border: '1px solid #f56565', borderRadius: '6px', padding: '6px 8px', marginBottom: '10px', fontSize: '11px', color: '#feb2b2' }}>
                                            Reason: {pkg.rejection_reason}
                                          </div>
                                        )}
                                      </div>

                                      {/* Controls */}
                                      <div style={{ borderTop: '1px solid rgba(229,193,88,0.15)', paddingTop: '12px', marginTop: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                          <span style={{ fontSize: '11px', color: pkg.is_active ? '#48bb78' : '#a0aec0' }}>
                                            {pkg.is_active ? '● Active' : '○ Paused'}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleTogglePackageActive(pkg)}
                                            style={{
                                              fontSize: '11px',
                                              padding: '2px 8px',
                                              borderRadius: '10px',
                                              background: 'rgba(255,255,255,0.08)',
                                              color: pkg.is_active ? '#48bb78' : '#cbd5e0',
                                              border: 'none',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            {pkg.is_active ? 'Pause' : 'Activate'}
                                          </button>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditPackage(pkg)}
                                            style={{
                                              flex: 1,
                                              padding: '7px',
                                              borderRadius: '6px',
                                              background: 'rgba(229,193,88,0.12)',
                                              border: '1px solid rgba(229,193,88,0.3)',
                                              color: '#e5c158',
                                              fontSize: '11px',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            ✏️ Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                                            style={{
                                              padding: '7px 10px',
                                              borderRadius: '6px',
                                              background: 'rgba(230,0,92,0.12)',
                                              border: '1px solid rgba(255,42,115,0.35)',
                                              color: '#ff80ab',
                                              fontSize: '11px',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {addOns.filter((a: any) => a.service_id === servicePackagesModalSrv.id).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 16px', background: '#061d15', borderRadius: '16px', border: '1px dashed rgba(229,193,88,0.25)' }}>
                              <div style={{ fontSize: '36px', marginBottom: '12px' }}>✨</div>
                              <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
                                No Optional Add-ons Configured for This Service
                              </h4>
                              <p style={{ fontSize: '13px', color: '#a0aec0', maxWidth: '420px', margin: '0 auto 18px auto' }}>
                                Create optional add-ons (e.g. Drone Cinematography, Extra Photographer, Teaser Reel, Pre-wedding Shoot) that clients can add to packages.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenAddAddOn(servicePackagesModalSrv.id)}
                                style={{
                                  padding: '10px 20px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                  color: '#fff',
                                  fontWeight: 'bold',
                                  fontSize: '13px',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                + Create First Add-on
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                              {addOns
                                .filter((a: any) => a.service_id === servicePackagesModalSrv.id)
                                .map((addon: any) => (
                                  <div
                                    key={addon.id}
                                    style={{
                                      background: '#07241a',
                                      border: '1px solid rgba(229,193,88,0.2)',
                                      borderRadius: '12px',
                                      padding: '16px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <h5 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                                          {addon.name}
                                        </h5>
                                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#e5c158' }}>
                                          +₹{parseFloat(addon.price || 0).toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                      <p style={{ fontSize: '12px', color: '#a0aec0', marginTop: '6px', marginBottom: '12px', lineHeight: '1.4' }}>
                                        {addon.description || 'Custom optional service enhancement.'}
                                      </p>
                                    </div>

                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleAddOnActive(addon)}
                                        style={{
                                          fontSize: '11px',
                                          padding: '2px 8px',
                                          borderRadius: '8px',
                                          background: addon.is_active ? 'rgba(56,161,105,0.2)' : 'rgba(255,255,255,0.08)',
                                          color: addon.is_active ? '#48bb78' : '#a0aec0',
                                          border: 'none',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        {addon.is_active ? 'Active' : 'Inactive'}
                                      </button>

                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditAddOn(addon)}
                                          style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            background: 'rgba(229,193,88,0.12)',
                                            color: '#e5c158',
                                            border: '1px solid rgba(229,193,88,0.3)',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAddOn(addon.id, addon.name)}
                                          style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: 'rgba(230,0,92,0.12)',
                                            color: '#ff80ab',
                                            border: '1px solid rgba(255,42,115,0.35)',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= ADD / EDIT PACKAGE MODAL ================= */}
              {showPackageModal && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(3, 23, 16, 0.88)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                  }}
                  onClick={() => setShowPackageModal(false)}
                >
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #062a1c 0%, #031710 100%)',
                      border: '1.5px solid rgba(229, 193, 88, 0.35)',
                      borderRadius: '20px',
                      maxWidth: '560px',
                      width: '100%',
                      padding: '30px',
                      boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '19px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>
                        {editingPackage ? 'Edit Wedding Package' : 'Create Wedding Package'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowPackageModal(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#cbd5e0',
                          fontSize: '20px',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {pkgActionErr && (
                      <div style={{ background: 'rgba(245,101,101,0.15)', border: '1px solid #f56565', color: '#feb2b2', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                        {pkgActionErr}
                      </div>
                    )}

                    <form onSubmit={handleSavePackage}>
                      {/* Service Association */}
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                          ASSOCIATED WEDDING SERVICE *
                        </label>
                        <select
                          value={pkgServiceId}
                          onChange={(e) => setPkgServiceId(e.target.value)}
                          required
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        >
                          <option value="">-- Select Associated Service --</option>
                          {services.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.title} ({s.category_name || 'Service'})</option>
                          ))}
                        </select>
                      </div>

                      {/* Tier & Name Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                            PACKAGE TIER *
                          </label>
                          <select
                            value={pkgTier}
                            onChange={(e: any) => setPkgTier(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                          >
                            <option value="BASIC">Basic (Starter)</option>
                            <option value="STANDARD">Standard (Popular)</option>
                            <option value="PREMIUM">Premium (Luxury)</option>
                            <option value="CUSTOM">Custom</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                            PACKAGE NAME *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Royal Imperial Package"
                            value={pkgName}
                            onChange={(e) => setPkgName(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                          />
                        </div>
                      </div>

                      {/* Price & Capacity Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                            PACKAGE PRICE (₹) *
                          </label>
                          <input
                            type="number"
                            placeholder="75000"
                            min="0"
                            step="500"
                            value={pkgPrice}
                            onChange={(e) => setPkgPrice(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                            GUEST CAPACITY
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="10000"
                            placeholder="200"
                            value={pkgGuestCapacity}
                            onChange={(e) => setPkgGuestCapacity(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                          />
                        </div>
                      </div>

                      {/* Inclusions */}
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                          INCLUSIONS / FEATURES (Comma-separated)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 4K Video, 2 Lead Photographers, Drone Footage, Traditional Album"
                          value={pkgInclusions}
                          onChange={(e) => setPkgInclusions(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        />
                        <span style={{ fontSize: '11px', color: '#718096', marginTop: '3px', display: 'block' }}>
                          These items automatically build the side-by-side comparison matrix for clients.
                        </span>
                      </div>

                      {/* Description */}
                      <div style={{ marginBottom: '18px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                          PACKAGE DESCRIPTION
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Describe deliverables, equipment, team size, turnaround time, or service guarantees..."
                          value={pkgDescription}
                          onChange={(e) => setPkgDescription(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        />
                      </div>

                      {/* Active Checkbox */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
                        <input
                          type="checkbox"
                          id="pkgIsActiveCheck"
                          checked={pkgIsActive}
                          onChange={(e) => setPkgIsActive(e.target.checked)}
                          style={{ accentColor: '#ff2a73', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="pkgIsActiveCheck" style={{ fontSize: '13px', color: '#cbd5e0', cursor: 'pointer' }}>
                          Active & Visible in customer comparison (subject to admin approval)
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setShowPackageModal(false)}
                          style={{
                            padding: '10px 18px',
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
                          disabled={savingPackage}
                          style={{
                            padding: '10px 24px',
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
                          {savingPackage ? 'Saving...' : (editingPackage ? 'Update Package' : 'Create & Submit Package')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ================= ADD / EDIT ADD-ON MODAL ================= */}
              {showAddOnModal && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(3, 23, 16, 0.88)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                  }}
                  onClick={() => setShowAddOnModal(false)}
                >
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #062a1c 0%, #031710 100%)',
                      border: '1.5px solid rgba(229, 193, 88, 0.35)',
                      borderRadius: '20px',
                      maxWidth: '520px',
                      width: '100%',
                      padding: '30px',
                      boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '19px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>
                        {editingAddOn ? 'Edit Optional Add-on' : 'Create Optional Add-on'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAddOnModal(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#cbd5e0',
                          fontSize: '20px',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {addonActionErr && (
                      <div style={{ background: 'rgba(245,101,101,0.15)', border: '1px solid #f56565', color: '#feb2b2', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                        {addonActionErr}
                      </div>
                    )}

                    <form onSubmit={handleSaveAddOn}>
                      {/* Name & Price Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                            ADD-ON NAME *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Drone Cinematography"
                            value={addonName}
                            onChange={(e) => setAddonName(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                            PRICE (₹) *
                          </label>
                          <input
                            type="number"
                            placeholder="5000"
                            min="0"
                            step="100"
                            value={addonPrice}
                            onChange={(e) => setAddonPrice(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                          />
                        </div>
                      </div>

                      {/* Associated Service */}
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                          ASSOCIATED WEDDING SERVICE
                        </label>
                        <select
                          value={addonServiceId}
                          onChange={(e) => setAddonServiceId(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        >
                          <option value="">-- Apply to All Services --</option>
                          {services.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                          ))}
                        </select>
                      </div>

                      {/* Associated Package (Optional) */}
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                          SPECIFIC PACKAGE (OPTIONAL)
                        </label>
                        <select
                          value={addonPackageId}
                          onChange={(e) => setAddonPackageId(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        >
                          <option value="">-- Available for all packages of this service --</option>
                          {packages
                            .filter((p: any) => !addonServiceId || p.service_id === addonServiceId)
                            .map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name} (₹{parseFloat(p.price).toLocaleString('en-IN')})</option>
                            ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div style={{ marginBottom: '18px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e5c158', marginBottom: '4px' }}>
                          ADD-ON DESCRIPTION / DELIVERABLES
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Describe what extra value or service is delivered with this optional add-on..."
                          value={addonDescription}
                          onChange={(e) => setAddonDescription(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', fontSize: '13px' }}
                        />
                      </div>

                      {/* Active Status Checkbox */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
                        <input
                          type="checkbox"
                          id="addonIsActiveCheck"
                          checked={addonIsActive}
                          onChange={(e) => setAddonIsActive(e.target.checked)}
                          style={{ accentColor: '#ff2a73', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="addonIsActiveCheck" style={{ fontSize: '13px', color: '#cbd5e0', cursor: 'pointer' }}>
                          Active & Discoverable in client package customizer
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddOnModal(false)}
                          style={{
                            padding: '10px 18px',
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
                          disabled={savingAddOn}
                          style={{
                            padding: '10px 24px',
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
                          {savingAddOn ? 'Saving...' : (editingAddOn ? 'Update Add-on' : 'Save Add-on')}
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
              {/* Top Header Card */}
              <div
                style={{
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
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                      Wedding Packages & Tiered Bundles
                    </h2>
                    <span
                      style={{
                        background: 'rgba(229,193,88,0.15)',
                        color: '#e5c158',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: '1px solid rgba(229,193,88,0.3)',
                      }}
                    >
                      {packages.length} Configured Packages
                    </span>
                    <span
                      style={{
                        background: 'rgba(255,42,115,0.15)',
                        color: '#ff80ab',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: '1px solid rgba(255,42,115,0.3)',
                      }}
                    >
                      {addOns.length} Optional Add-ons
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#a0aec0', marginTop: '6px', marginBottom: 0 }}>
                    Create and manage Basic, Standard, and Premium packages associated with your wedding services. All changes undergo compliance verification before public customer publishing.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenComparisonPreview(selectedFilterServiceId !== 'all' ? selectedFilterServiceId : undefined)}
                    style={{
                      padding: '11px 18px',
                      borderRadius: '10px',
                      background: 'rgba(229,193,88,0.15)',
                      border: '1px solid rgba(229,193,88,0.35)',
                      color: '#e5c158',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>👁️</span> Compare Packages Preview
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAddAddOn(selectedFilterServiceId !== 'all' ? selectedFilterServiceId : undefined)}
                    style={{
                      padding: '11px 18px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>✨</span> + Add Add-on
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAddPackage(selectedFilterServiceId !== 'all' ? selectedFilterServiceId : undefined)}
                    style={{
                      padding: '11px 22px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>+</span> Add New Package
                  </button>
                </div>
              </div>

              {/* Filter & Tier Stats Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '24px',
                  background: '#07241a',
                  padding: '16px 20px',
                  borderRadius: '14px',
                  border: '1px solid rgba(229,193,88,0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#e5c158' }}>
                    Filter by Service:
                  </label>
                  <select
                    value={selectedFilterServiceId}
                    onChange={(e) => setSelectedFilterServiceId(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#0a2e21',
                      border: '1px solid rgba(229,193,88,0.3)',
                      color: '#fff',
                      fontSize: '13px',
                      minWidth: '220px',
                    }}
                  >
                    <option value="all">All Services ({services.length})</option>
                    {services.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#a0aec0', flexWrap: 'wrap' }}>
                  <span>
                    Basic: <strong style={{ color: '#e2e8f0' }}>{packages.filter((p: any) => p.package_tier === 'BASIC').length}</strong>
                  </span>
                  <span>
                    Standard: <strong style={{ color: '#e5c158' }}>{packages.filter((p: any) => p.package_tier === 'STANDARD').length}</strong>
                  </span>
                  <span>
                    Premium: <strong style={{ color: '#ff80ab' }}>{packages.filter((p: any) => p.package_tier === 'PREMIUM').length}</strong>
                  </span>
                  <span>
                    Live Approved: <strong style={{ color: '#48bb78' }}>{packages.filter((p: any) => p.moderation_status === 'APPROVED' && p.is_active).length}</strong>
                  </span>
                </div>
              </div>

              {/* Packages List */}
              {packages.filter((p: any) => selectedFilterServiceId === 'all' || p.service_id === selectedFilterServiceId).length === 0 ? (
                <div
                  style={{
                    background: '#061d15',
                    borderRadius: '16px',
                    border: '1px dashed rgba(229,193,88,0.3)',
                    padding: '48px 24px',
                    textAlign: 'center',
                    marginBottom: '32px',
                  }}
                >
                  <div style={{ fontSize: '42px', marginBottom: '12px' }}>📦</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
                    No Packages Configured
                  </h3>
                  <p style={{ fontSize: '13px', color: '#a0aec0', maxWidth: '460px', margin: '0 auto 18px auto' }}>
                    Configure tiered bundles (Basic, Standard, Premium) for your services so clients can compare deliverables and pricing side-by-side.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddPackage(selectedFilterServiceId !== 'all' ? selectedFilterServiceId : undefined)}
                    style={{
                      padding: '11px 22px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    + Create First Package
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '22px', marginBottom: '36px' }}>
                  {packages
                    .filter((p: any) => selectedFilterServiceId === 'all' || p.service_id === selectedFilterServiceId)
                    .map((pkg: any) => {
                      const isApproved = pkg.moderation_status === 'APPROVED';
                      const isPending = pkg.moderation_status === 'PENDING_REVIEW';
                      const isRejected = pkg.moderation_status === 'REJECTED';

                      return (
                        <div
                          key={pkg.id}
                          style={{
                            background: '#07241a',
                            border: isRejected ? '1px solid rgba(245,101,101,0.45)' : '1px solid rgba(229,193,88,0.22)',
                            borderRadius: '16px',
                            padding: '22px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                          }}
                        >
                          <div>
                            {/* Tier Badge & Moderation Badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '3px 10px',
                                  borderRadius: '6px',
                                  textTransform: 'uppercase',
                                  background: pkg.package_tier === 'PREMIUM'
                                    ? 'rgba(255,42,115,0.2)'
                                    : pkg.package_tier === 'BASIC'
                                    ? 'rgba(160,174,192,0.2)'
                                    : 'rgba(229,193,88,0.2)',
                                  color: pkg.package_tier === 'PREMIUM'
                                    ? '#ff80ab'
                                    : pkg.package_tier === 'BASIC'
                                    ? '#e2e8f0'
                                    : '#e5c158',
                                  border: '1px solid rgba(229,193,88,0.3)',
                                }}
                              >
                                {pkg.package_tier || 'STANDARD'} TIER
                              </span>

                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  background: isApproved ? 'rgba(56,161,105,0.2)' : isPending ? 'rgba(237,137,54,0.2)' : 'rgba(245,101,101,0.2)',
                                  color: isApproved ? '#48bb78' : isPending ? '#ed8936' : '#f56565',
                                  border: `1px solid ${isApproved ? '#48bb78' : isPending ? '#ed8936' : '#f56565'}`,
                                }}
                              >
                                {isApproved ? '✓ APPROVED' : isPending ? '⏳ PENDING REVIEW' : '✕ REJECTED'}
                              </span>
                            </div>

                            {/* Service Association Badge */}
                            {pkg.service_title && (
                              <div style={{ fontSize: '12px', color: '#cbd5e0', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#e5c158' }}>🛎️</span> {pkg.service_title}
                              </div>
                            )}

                            {/* Package Name */}
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '0 0 8px 0' }}>
                              {pkg.name}
                            </h3>

                            {/* Price */}
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e5c158', margin: '8px 0 10px 0' }}>
                              ₹{parseFloat(pkg.price || 0).toLocaleString('en-IN')}
                            </div>

                            {/* Description */}
                            <p style={{ fontSize: '13px', color: '#a0aec0', minHeight: '36px', marginBottom: '12px', lineHeight: '1.5' }}>
                              {pkg.description || 'Full comprehensive wedding package fulfillment.'}
                            </p>

                            {/* Capacity */}
                            <div style={{ fontSize: '12px', color: '#cbd5e0', marginBottom: '12px' }}>
                              👥 Guest Capacity: <strong>{pkg.guest_capacity || 200} guests</strong>
                            </div>

                            {/* Inclusions */}
                            {pkg.included_items && pkg.included_items.length > 0 && (
                              <div style={{ marginBottom: '14px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#a0aec0', marginBottom: '6px', textTransform: 'uppercase' }}>
                                  Inclusions ({pkg.included_items.length}):
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {pkg.included_items.map((inc: string, idx: number) => (
                                    <span
                                      key={idx}
                                      style={{
                                        fontSize: '11px',
                                        background: 'rgba(255,255,255,0.06)',
                                        color: '#e2e8f0',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                      }}
                                    >
                                      ✓ {inc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isRejected && pkg.rejection_reason && (
                              <div style={{ background: 'rgba(245,101,101,0.12)', border: '1px solid #f56565', borderRadius: '8px', padding: '8px 10px', marginBottom: '12px', fontSize: '12px', color: '#feb2b2' }}>
                                <div style={{ fontWeight: 'bold' }}>Rejection Reason:</div>
                                {pkg.rejection_reason}
                              </div>
                            )}
                          </div>

                          {/* Footer Controls */}
                          <div style={{ borderTop: '1px solid rgba(229,193,88,0.15)', paddingTop: '14px', marginTop: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '12px', color: pkg.is_active ? '#48bb78' : '#a0aec0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pkg.is_active ? '#48bb78' : '#718096' }}></span>
                                {pkg.is_active ? 'Active & Discoverable' : 'Paused / Inactive'}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleTogglePackageActive(pkg)}
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  background: pkg.is_active ? 'rgba(56,161,105,0.2)' : 'rgba(255,255,255,0.08)',
                                  color: pkg.is_active ? '#48bb78' : '#cbd5e0',
                                  border: `1px solid ${pkg.is_active ? '#48bb78' : '#718096'}`,
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                {pkg.is_active ? 'Pause' : 'Activate'}
                              </button>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPackage(pkg)}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
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
                                }}
                              >
                                ✏️ Edit Package
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '8px',
                                  background: 'rgba(230,0,92,0.12)',
                                  border: '1px solid rgba(255,42,115,0.35)',
                                  color: '#ff80ab',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Optional Add-ons Command Center */}
              <div
                style={{
                  background: '#061d15',
                  border: '1px solid rgba(229,193,88,0.25)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '19px', fontWeight: 'bold', color: '#e5c158', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>✨</span> Optional Add-ons & Extras
                    </h3>
                    <p style={{ fontSize: '13px', color: '#a0aec0', marginTop: '4px', marginBottom: 0 }}>
                      Manage add-on services that customers can choose to append to packages.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddAddOn(selectedFilterServiceId !== 'all' ? selectedFilterServiceId : undefined)}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                    }}
                  >
                    + Add Optional Add-on
                  </button>
                </div>

                {addOns.filter((a: any) => selectedFilterServiceId === 'all' || a.service_id === selectedFilterServiceId).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#a0aec0', fontSize: '13px' }}>
                    <div style={{ fontSize: '30px', marginBottom: '8px' }}>✨</div>
                    No optional add-ons configured yet. Add extras like Drone Cinematography, Extra Hours, or Teaser Reels.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {addOns
                      .filter((a: any) => selectedFilterServiceId === 'all' || a.service_id === selectedFilterServiceId)
                      .map((addon: any) => (
                        <div
                          key={addon.id}
                          style={{
                            background: '#07241a',
                            border: '1px solid rgba(229,193,88,0.2)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                                {addon.name}
                              </h4>
                              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#e5c158' }}>
                                +₹{parseFloat(addon.price || 0).toLocaleString('en-IN')}
                              </span>
                            </div>

                            {addon.service_title && (
                              <div style={{ fontSize: '11px', color: '#cbd5e0', marginTop: '4px' }}>
                                Attached to: {addon.service_title}
                              </div>
                            )}

                            <p style={{ fontSize: '12px', color: '#a0aec0', marginTop: '6px', marginBottom: '12px', lineHeight: '1.4' }}>
                              {addon.description || 'Optional service enhancement.'}
                            </p>
                          </div>

                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleAddOnActive(addon)}
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                background: addon.is_active ? 'rgba(56,161,105,0.2)' : 'rgba(255,255,255,0.08)',
                                color: addon.is_active ? '#48bb78' : '#a0aec0',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {addon.is_active ? 'Active' : 'Inactive'}
                            </button>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditAddOn(addon)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(229,193,88,0.12)',
                                  color: '#e5c158',
                                  border: '1px solid rgba(229,193,88,0.3)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAddOn(addon.id, addon.name)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(230,0,92,0.12)',
                                  color: '#ff80ab',
                                  border: '1px solid rgba(255,42,115,0.35)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 4: CALENDAR & AVAILABILITY ================= */}
          {activeTab === 'calendar' && (() => {
            const [yNum, mNum] = calendarMonth.split('-').map(Number);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthTitle = `${monthNames[mNum - 1]} ${yNum}`;

            // Calculate calendar days
            const firstDayObj = new Date(Date.UTC(yNum, mNum - 1, 1));
            const dayOfWeek = (firstDayObj.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
            const totalDaysInMonth = new Date(Date.UTC(yNum, mNum, 0)).getUTCDate();

            const todayStr = (() => {
              const now = new Date();
              return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            })();

            return (
              <div>
                {/* Header & Controls Bar */}
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.25)', padding: '24px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>
                        📅 Availability Calendar & Slot Management
                      </h2>
                      <p style={{ color: '#9cb1a6', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Manage open wedding dates, block off-seasons or personal leaves, and monitor real-time booking locks.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {/* Service Filter */}
                      <select
                        value={calendarServiceId}
                        onChange={(e) => setCalendarServiceId(e.target.value)}
                        style={{
                          padding: '9px 14px',
                          borderRadius: '8px',
                          background: '#0a251b',
                          border: '1px solid rgba(229,193,88,0.3)',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      >
                        <option value="ALL">✨ All Services (Entire Studio)</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            🏷️ {s.title}
                          </option>
                        ))}
                      </select>

                      {/* Batch Block Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setBatchStartDate('');
                          setBatchEndDate('');
                          setBatchNotes('');
                          setBatchServiceId(calendarServiceId || 'ALL');
                          setShowBatchBlockModal(true);
                        }}
                        style={{
                          padding: '9px 16px',
                          background: 'linear-gradient(135deg, rgba(255,42,115,0.2) 0%, rgba(230,0,92,0.3) 100%)',
                          border: '1px solid rgba(255,42,115,0.5)',
                          color: '#ff80ab',
                          fontWeight: 600,
                          borderRadius: '8px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>➕</span> Block Date Range
                      </button>
                    </div>
                  </div>

                  {/* Month Switcher Toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#0a251b', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleMonthNav('prev')}
                        style={{
                          padding: '6px 14px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        ◀ Prev
                      </button>

                      <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#e5c158', minWidth: '160px', textAlign: 'center' }}>
                        {monthTitle}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleMonthNav('next')}
                        style={{
                          padding: '6px 14px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        Next ▶
                      </button>

                      <button
                        type="button"
                        onClick={handleJumpToday}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(229,193,88,0.15)',
                          border: '1px solid rgba(229,193,88,0.4)',
                          color: '#e5c158',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Today
                      </button>
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#48bb78', display: 'inline-block' }}></span>
                        <span style={{ color: '#a0aec0' }}>Available</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff2a73', display: 'inline-block' }}></span>
                        <span style={{ color: '#a0aec0' }}>Vendor Blocked</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#e5c158', display: 'inline-block' }}></span>
                        <span style={{ color: '#a0aec0' }}>Confirmed Booking</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38b2ac', display: 'inline-block' }}></span>
                        <span style={{ color: '#a0aec0' }}>Checkout Lock</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: '#061d15', borderRadius: '14px', border: '1px solid rgba(72,187,120,0.3)', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🟢 Open Wedding Dates</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#48bb78', marginTop: '4px' }}>
                      {availability?.summary?.available_days ?? 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Ready for customer inquiries</div>
                  </div>

                  <div style={{ background: '#061d15', borderRadius: '14px', border: '1px solid rgba(255,42,115,0.3)', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⛔ Vendor Blocked Dates</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#ff2a73', marginTop: '4px' }}>
                      {availability?.summary?.blocked_days ?? 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Leaves, travel & maintenance</div>
                  </div>

                  <div style={{ background: '#061d15', borderRadius: '14px', border: '1px solid rgba(229,193,88,0.3)', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔒 Committed Bookings</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#e5c158', marginTop: '4px' }}>
                      {availability?.summary?.booked_days ?? 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Escrow protected contracts</div>
                  </div>

                  <div style={{ background: '#061d15', borderRadius: '14px', border: '1px solid rgba(56,178,172,0.3)', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏳ Active Reservation Locks</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#38b2ac', marginTop: '4px' }}>
                      {availability?.summary?.locked_days ?? 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Clients currently in checkout</div>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.25)', padding: '24px', overflowX: 'auto' }}>
                  {/* Days of Week Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => (
                      <div key={idx} style={{ textAlign: 'center', color: '#e5c158', fontWeight: 600, fontSize: '13px', padding: '8px 0', background: '#0a251b', borderRadius: '8px' }}>
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* Month Day Cells */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', gap: '8px' }}>
                    {/* Leading blank days */}
                    {Array.from({ length: dayOfWeek }).map((_, idx) => (
                      <div key={`blank-${idx}`} style={{ minHeight: '90px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.05)' }}></div>
                    ))}

                    {/* Active Month Days */}
                    {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const dayStr = String(dayNum).padStart(2, '0');
                      const dateKey = `${calendarMonth}-${dayStr}`;
                      const dayItem = availability?.calendar_dates?.[dateKey] || {
                        date: dateKey,
                        status: 'AVAILABLE',
                        can_unblock: false,
                      };

                      const isToday = dateKey === todayStr;
                      const status = dayItem.status || 'AVAILABLE';

                      // Style variants
                      let borderColor = 'rgba(255,255,255,0.08)';
                      let bgColor = '#0a251b';
                      let statusBadge = (
                        <span style={{ fontSize: '11px', color: '#48bb78', background: 'rgba(72,187,120,0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                          ● Open
                        </span>
                      );

                      if (status === 'BLOCKED') {
                        borderColor = 'rgba(255,42,115,0.45)';
                        bgColor = 'rgba(255,42,115,0.09)';
                        statusBadge = (
                          <span style={{ fontSize: '11px', color: '#ff80ab', background: 'rgba(255,42,115,0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            ⛔ Blocked
                          </span>
                        );
                      } else if (status === 'BOOKED') {
                        borderColor = 'rgba(229,193,88,0.6)';
                        bgColor = 'rgba(229,193,88,0.1)';
                        statusBadge = (
                          <span style={{ fontSize: '11px', color: '#e5c158', background: 'rgba(229,193,88,0.25)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            🔒 Booked
                          </span>
                        );
                      } else if (status === 'LOCKED') {
                        borderColor = 'rgba(56,178,172,0.5)';
                        bgColor = 'rgba(56,178,172,0.1)';
                        statusBadge = (
                          <span style={{ fontSize: '11px', color: '#38b2ac', background: 'rgba(56,178,172,0.25)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            ⏳ Locked
                          </span>
                        );
                      }

                      return (
                        <div
                          key={dateKey}
                          onClick={() => handleOpenDateModal(dateKey)}
                          style={{
                            minHeight: '94px',
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            borderRadius: '10px',
                            padding: '8px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease',
                            position: 'relative',
                            boxShadow: isToday ? '0 0 0 2px #e5c158' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: isToday ? 800 : 600, color: isToday ? '#e5c158' : '#fff', fontSize: '14px' }}>
                              {dayNum}
                            </span>
                            {isToday && (
                              <span style={{ fontSize: '9px', background: '#e5c158', color: '#031710', fontWeight: 'bold', padding: '1px 5px', borderRadius: '4px' }}>
                                TODAY
                              </span>
                            )}
                          </div>

                          <div style={{ marginTop: '6px' }}>{statusBadge}</div>

                          <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {status === 'BOOKED' && (dayItem.booking_number || 'Confirmed')}
                            {status === 'BLOCKED' && (dayItem.reason?.replace(/_/g, ' ') || 'Unavailable')}
                            {status === 'LOCKED' && 'Checkout hold'}
                            {status === 'AVAILABLE' && <span style={{ color: '#48bb78', opacity: 0.7 }}>Click to block</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Date Management Action Modal */}
                {selectedDateItem && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.85)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9999,
                      padding: '20px',
                    }}
                  >
                    <div
                      style={{
                        background: '#061d15',
                        border: '1px solid rgba(229,193,88,0.35)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '520px',
                        padding: '28px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase' }}>Selected Date Slot</div>
                          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e5c158', margin: '4px 0 0 0' }}>
                            {new Date(selectedDateItem.date + 'T00:00:00Z').toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedDateItem(null)}
                          style={{ background: 'none', border: 'none', color: '#a0aec0', fontSize: '20px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>

                      {calendarActionErr && (
                        <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #ff2a73', borderRadius: '8px', padding: '10px 14px', color: '#ff80ab', fontSize: '13px', marginBottom: '16px' }}>
                          ⚠️ {calendarActionErr}
                        </div>
                      )}

                      {/* State 1: Booked & Confirmed */}
                      {selectedDateItem.status === 'BOOKED' && (
                        <div>
                          <div style={{ background: 'rgba(229,193,88,0.12)', border: '1px solid rgba(229,193,88,0.4)', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5c158', fontWeight: 'bold', fontSize: '15px' }}>
                              <span>🔒</span> Confirmed Wedding Booking
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '13px', color: '#cbd5e0', lineHeight: 1.6 }}>
                              <div><strong>Booking ID:</strong> {selectedDateItem.booking_number}</div>
                              {selectedDateItem.customer_name && <div><strong>Client Name:</strong> {selectedDateItem.customer_name}</div>}
                              {selectedDateItem.service_title && <div><strong>Service:</strong> {selectedDateItem.service_title}</div>}
                              {selectedDateItem.guest_count && <div><strong>Expected Guests:</strong> {selectedDateItem.guest_count}</div>}
                            </div>
                          </div>

                          <div style={{ background: 'rgba(72,187,120,0.1)', border: '1px solid rgba(72,187,120,0.25)', borderRadius: '8px', padding: '12px', color: '#48bb78', fontSize: '12px', marginBottom: '20px', lineHeight: 1.5 }}>
                            🛡️ <strong>Anti Double-Booking Protection Active:</strong> This date is committed to a client contract and escrow agreement. It cannot be manually unblocked or made available.
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedDateItem(null)}
                            style={{ width: '100%', padding: '11px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Close
                          </button>
                        </div>
                      )}

                      {/* State 2: Locked during checkout */}
                      {selectedDateItem.status === 'LOCKED' && (
                        <div>
                          <div style={{ background: 'rgba(56,178,172,0.12)', border: '1px solid rgba(56,178,172,0.4)', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38b2ac', fontWeight: 'bold', fontSize: '15px' }}>
                              <span>⏳</span> Temporary Checkout Reservation Lock
                            </div>
                            <p style={{ fontSize: '13px', color: '#cbd5e0', marginTop: '8px', lineHeight: 1.5 }}>
                              A customer is actively completing checkout for this date. The inventory slot is locked for 15 minutes to guarantee anti-double-booking. If checkout is cancelled or times out, the slot will revert to available automatically.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedDateItem(null)}
                            style={{ width: '100%', padding: '11px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Close
                          </button>
                        </div>
                      )}

                      {/* State 3: Blocked by vendor */}
                      {selectedDateItem.status === 'BLOCKED' && (
                        <div>
                          <div style={{ background: 'rgba(255,42,115,0.1)', border: '1px solid rgba(255,42,115,0.35)', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff80ab', fontWeight: 'bold', fontSize: '15px' }}>
                              <span>⛔</span> Currently Blocked / Unavailable
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '13px', color: '#cbd5e0' }}>
                              <div><strong>Reason:</strong> {selectedDateItem.reason?.replace(/_/g, ' ') || 'Vendor block'}</div>
                              {selectedDateItem.notes && <div style={{ marginTop: '4px' }}><strong>Notes:</strong> {selectedDateItem.notes}</div>}
                              {selectedDateItem.service_title && <div style={{ marginTop: '4px' }}><strong>Service Scope:</strong> {selectedDateItem.service_title}</div>}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                              type="button"
                              disabled={savingAvailability}
                              onClick={() => handleSaveDateStatus('AVAILABLE')}
                              style={{
                                flex: 1,
                                padding: '12px',
                                background: 'linear-gradient(135deg, #38a169 0%, #276749 100%)',
                                color: '#fff',
                                fontWeight: 'bold',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                            >
                              {savingAvailability ? 'Unblocking...' : '🔓 Unblock Date (Set Available)'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDateItem(null)}
                              style={{ padding: '12px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* State 4: Available (Click to block) */}
                      {selectedDateItem.status === 'AVAILABLE' && (
                        <div>
                          <div style={{ background: 'rgba(72,187,120,0.1)', border: '1px solid rgba(72,187,120,0.3)', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
                            <div style={{ color: '#48bb78', fontWeight: 'bold', fontSize: '14px' }}>
                              🟢 This date is currently Open & Available
                            </div>
                            <p style={{ color: '#a0aec0', fontSize: '12px', margin: '4px 0 0 0' }}>
                              You can block this date if your team is booked offline, on personal leave, or travelling.
                            </p>
                          </div>

                          <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>REASON FOR BLOCKING</label>
                            <select
                              value={dateModalReason}
                              onChange={(e) => setDateModalReason(e.target.value)}
                              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', outline: 'none' }}
                            >
                              <option value="PERSONAL_LEAVE">🏖️ Personal Leave / Family Event</option>
                              <option value="TRAVEL">✈️ Destination Wedding Travel / Shoot</option>
                              <option value="MAINTENANCE">🔧 Studio Maintenance / Off-Day</option>
                              <option value="OFF_SEASON">❄️ Off-Season Break</option>
                              <option value="CUSTOM">📝 Other / Custom Reason</option>
                            </select>
                          </div>

                          <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>SERVICE SCOPE</label>
                            <select
                              value={dateModalServiceId}
                              onChange={(e) => setDateModalServiceId(e.target.value)}
                              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', outline: 'none' }}
                            >
                              <option value="ALL">✨ Entire Studio (All Services Blocked)</option>
                              {services.map((s) => (
                                <option key={s.id} value={s.id}>
                                  🏷️ Only {s.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>INTERNAL NOTES (OPTIONAL)</label>
                            <input
                              type="text"
                              value={dateModalNotes}
                              onChange={(e) => setDateModalNotes(e.target.value)}
                              placeholder="e.g. Royal palace shoot in Udaipur"
                              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', outline: 'none' }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                              type="button"
                              disabled={savingAvailability}
                              onClick={() => handleSaveDateStatus('BLOCKED')}
                              style={{
                                flex: 1,
                                padding: '12px',
                                background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                color: '#fff',
                                fontWeight: 'bold',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(230,0,92,0.35)',
                              }}
                            >
                              {savingAvailability ? 'Blocking...' : '⛔ Mark Date Unavailable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDateItem(null)}
                              style={{ padding: '12px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Batch Block Range Modal */}
                {showBatchBlockModal && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.85)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9999,
                      padding: '20px',
                    }}
                  >
                    <div
                      style={{
                        background: '#061d15',
                        border: '1px solid rgba(229,193,88,0.35)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '520px',
                        padding: '28px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e5c158', margin: 0 }}>
                            ➕ Block Date Range
                          </h3>
                          <p style={{ color: '#9cb1a6', fontSize: '13px', margin: '4px 0 0 0' }}>
                            Block multiple consecutive dates (e.g., vacation, destination shoots, off-season).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowBatchBlockModal(false)}
                          style={{ background: 'none', border: 'none', color: '#a0aec0', fontSize: '20px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>

                      {calendarActionErr && (
                        <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #ff2a73', borderRadius: '8px', padding: '10px 14px', color: '#ff80ab', fontSize: '13px', marginBottom: '16px' }}>
                          ⚠️ {calendarActionErr}
                        </div>
                      )}

                      <form onSubmit={handleSubmitBatchBlock}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>START DATE</label>
                            <input
                              type="date"
                              required
                              value={batchStartDate}
                              onChange={(e) => setBatchStartDate(e.target.value)}
                              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>END DATE</label>
                            <input
                              type="date"
                              required
                              value={batchEndDate}
                              onChange={(e) => setBatchEndDate(e.target.value)}
                              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', outline: 'none' }}
                            />
                          </div>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>REASON FOR BLOCKING</label>
                          <select
                            value={batchReason}
                            onChange={(e) => setBatchReason(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', outline: 'none' }}
                          >
                            <option value="PERSONAL_LEAVE">🏖️ Personal Leave / Vacation</option>
                            <option value="TRAVEL">✈️ Destination Wedding Shoot</option>
                            <option value="MAINTENANCE">🔧 Studio Maintenance</option>
                            <option value="OFF_SEASON">❄️ Off-Season Break</option>
                            <option value="CUSTOM">📝 Other / Custom Reason</option>
                          </select>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>SERVICE SCOPE</label>
                          <select
                            value={batchServiceId}
                            onChange={(e) => setBatchServiceId(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', outline: 'none' }}
                          >
                            <option value="ALL">✨ Entire Studio (All Services Blocked)</option>
                            {services.map((s) => (
                              <option key={s.id} value={s.id}>
                                🏷️ Only {s.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>NOTES</label>
                          <input
                            type="text"
                            value={batchNotes}
                            onChange={(e) => setBatchNotes(e.target.value)}
                            placeholder="Optional notes for reference"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff', outline: 'none' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            type="submit"
                            disabled={savingAvailability}
                            style={{
                              flex: 1,
                              padding: '12px',
                              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                              color: '#fff',
                              fontWeight: 'bold',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(230,0,92,0.35)',
                            }}
                          >
                            {savingAvailability ? 'Blocking Range...' : '⛔ Block Date Range'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBatchBlockModal(false)}
                            style={{ padding: '12px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ================= TAB 5: BOOKINGS & LEADS ================= */}
          {activeTab === 'bookings' && (() => {
            const pendingCount = bookings.filter((b: any) => ['REQUESTED', 'PENDING_VENDOR', 'PENDING'].includes(b.status)).length;
            const confirmedCount = bookings.filter((b: any) => ['CONFIRMED', 'IN_PROGRESS', 'ACCEPTED'].includes(b.status)).length;
            const completedCount = bookings.filter((b: any) => b.status === 'COMPLETED').length;
            const cancelledCount = bookings.filter((b: any) => ['CANCELLED', 'REJECTED'].includes(b.status)).length;
            const pipelineEarnings = bookings
              .filter((b: any) => ['REQUESTED', 'ACCEPTED', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status))
              .reduce((sum: number, b: any) => sum + (parseFloat(b.vendor_payout_amount) || 0), 0);

            const filteredBookings = bookings.filter((b: any) => {
              if (bookingFilterStatus === 'PENDING') {
                if (!['REQUESTED', 'PENDING_VENDOR', 'PENDING'].includes(b.status)) return false;
              } else if (bookingFilterStatus === 'CONFIRMED') {
                if (!['CONFIRMED', 'IN_PROGRESS', 'ACCEPTED'].includes(b.status)) return false;
              } else if (bookingFilterStatus === 'COMPLETED') {
                if (b.status !== 'COMPLETED') return false;
              } else if (bookingFilterStatus === 'CANCELLED') {
                if (!['CANCELLED', 'REJECTED'].includes(b.status)) return false;
              }

              if (bookingSearch.trim()) {
                const q = bookingSearch.toLowerCase();
                const matchNo = (b.booking_number || '').toLowerCase().includes(q);
                const matchName = (b.customer_name || '').toLowerCase().includes(q);
                const matchPhone = (b.customer_phone || '').toLowerCase().includes(q);
                const matchLoc = (b.event_location || '').toLowerCase().includes(q);
                const matchTitle = (b.service_title || '').toLowerCase().includes(q);
                if (!matchNo && !matchName && !matchPhone && !matchLoc && !matchTitle) return false;
              }
              return true;
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Top KPI Header Banner */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #072218 0%, #031710 100%)',
                    borderRadius: '20px',
                    border: '1.5px solid rgba(229,193,88,0.3)',
                    padding: '28px',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '24px' }}>💌</span>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#e5c158', letterSpacing: '-0.5px', margin: 0 }}>
                          Wedding Bookings & Fulfillment Suite
                        </h2>
                      </div>
                      <p style={{ color: '#a0aec0', fontSize: '14px', maxWidth: '680px', margin: 0 }}>
                        Review incoming couple requests, authorize dates, manage fulfillment lifecycle, and communicate directly with your clients.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        loadBookings();
                        loadVendorOverview();
                      }}
                      style={{
                        padding: '10px 18px',
                        background: 'rgba(229,193,88,0.12)',
                        border: '1px solid rgba(229,193,88,0.35)',
                        borderRadius: '10px',
                        color: '#e5c158',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>🔄</span> Sync Requests
                    </button>
                  </div>

                  {/* 5 KPI Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div style={{ background: '#0a251b', borderRadius: '14px', border: '1px solid rgba(229,193,88,0.15)', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Inquiries</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff' }}>{bookings.length}</div>
                      <div style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>Across all categories</div>
                    </div>

                    <div style={{ background: '#0a251b', borderRadius: '14px', border: '1px solid rgba(255,42,115,0.3)', padding: '16px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: '#ff2a73' }} />
                      <div style={{ fontSize: '12px', color: '#ff80ab', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Action Required</span>
                        {pendingCount > 0 && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff2a73', display: 'inline-block' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: '#ff4d88' }}>{pendingCount}</div>
                      <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>Awaiting vendor response</div>
                    </div>

                    <div style={{ background: '#0a251b', borderRadius: '14px', border: '1px solid rgba(72,187,120,0.25)', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#68d391', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirmed & Active</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: '#48bb78' }}>{confirmedCount}</div>
                      <div style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>Dates secured & scheduled</div>
                    </div>

                    <div style={{ background: '#0a251b', borderRadius: '14px', border: '1px solid rgba(229,193,88,0.2)', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#e5c158', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fulfilled Celebrations</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: '#e5c158' }}>{completedCount}</div>
                      <div style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>Successfully completed</div>
                    </div>

                    <div style={{ background: '#0a251b', borderRadius: '14px', border: '1px solid rgba(229,193,88,0.25)', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pipeline Net Payout</div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#48bb78' }}>
                        ₹{pipelineEarnings.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>Active bookings pipeline</div>
                    </div>
                  </div>
                </div>

                {/* Filters and Search Toolbar */}
                <div
                  style={{
                    background: '#061d15',
                    borderRadius: '16px',
                    border: '1px solid rgba(229,193,88,0.2)',
                    padding: '18px 22px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  {/* Status Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { key: 'ALL', label: 'All Inquiries', count: bookings.length },
                      { key: 'PENDING', label: 'Action Required', count: pendingCount, highlight: pendingCount > 0 },
                      { key: 'CONFIRMED', label: 'Confirmed & Active', count: confirmedCount },
                      { key: 'COMPLETED', label: 'Completed', count: completedCount },
                      { key: 'CANCELLED', label: 'Cancelled / Declined', count: cancelledCount },
                    ].map((tab) => {
                      const isSelected = bookingFilterStatus === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setBookingFilterStatus(tab.key as any)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: isSelected
                              ? '1.5px solid #e5c158'
                              : tab.highlight
                              ? '1.5px solid #ff2a73'
                              : '1px solid rgba(255,255,255,0.1)',
                            background: isSelected
                              ? 'rgba(229,193,88,0.18)'
                              : tab.highlight
                              ? 'rgba(255,42,115,0.15)'
                              : 'rgba(255,255,255,0.04)',
                            color: isSelected ? '#e5c158' : tab.highlight ? '#ff80ab' : '#cbd5e0',
                            fontSize: '13px',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <span>{tab.label}</span>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isSelected
                                ? 'rgba(229,193,88,0.3)'
                                : 'rgba(255,255,255,0.1)',
                              color: isSelected ? '#fff' : '#a0aec0',
                            }}
                          >
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Input */}
                  <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 260px', maxWidth: '400px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#718096', fontSize: '14px' }}>
                      🔍
                    </span>
                    <input
                      type="text"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      placeholder="Search booking #, client, venue..."
                      style={{
                        width: '100%',
                        padding: '9px 14px 9px 36px',
                        background: '#0a251b',
                        border: '1px solid rgba(229,193,88,0.25)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                    {bookingSearch && (
                      <button
                        onClick={() => setBookingSearch('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#a0aec0',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Bookings List Section */}
                <div
                  style={{
                    background: '#061d15',
                    borderRadius: '16px',
                    border: '1px solid rgba(229,193,88,0.2)',
                    padding: '24px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#e5c158' }}>
                      Showing {filteredBookings.length} {filteredBookings.length === 1 ? 'Booking Request' : 'Booking Requests'}
                    </div>
                    {bookingFilterStatus !== 'ALL' && (
                      <button
                        onClick={() => setBookingFilterStatus('ALL')}
                        style={{ background: 'none', border: 'none', color: '#a0aec0', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Clear Status Filter
                      </button>
                    )}
                  </div>

                  {filteredBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aec0' }}>
                      <div style={{ fontSize: '48px', marginBottom: '14px' }}>📋</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                        No bookings matching your criteria
                      </div>
                      <p style={{ fontSize: '13px', maxWidth: '440px', margin: '0 auto 20px' }}>
                        {bookingSearch
                          ? `No bookings match your search query "${bookingSearch}". Try checking your spelling or clearing filters.`
                          : 'You do not have any bookings in this status tab at present.'}
                      </p>
                      {bookingSearch && (
                        <button
                          onClick={() => setBookingSearch('')}
                          style={{
                            padding: '8px 18px',
                            background: 'rgba(229,193,88,0.15)',
                            border: '1px solid #e5c158',
                            color: '#e5c158',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {filteredBookings.map((b: any) => {
                        const isPending = ['REQUESTED', 'PENDING_VENDOR', 'PENDING'].includes(b.status);
                        const isAccepted = b.status === 'ACCEPTED';
                        const isConfirmed = b.status === 'CONFIRMED';
                        const isInProgress = b.status === 'IN_PROGRESS';
                        const isCompleted = b.status === 'COMPLETED';
                        const isCancelled = ['CANCELLED', 'REJECTED'].includes(b.status);

                        const formattedDate = new Date(b.event_date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });

                        return (
                          <div
                            key={b.id}
                            style={{
                              background: '#09251b',
                              borderRadius: '14px',
                              border: isPending
                                ? '1.5px solid rgba(255,42,115,0.45)'
                                : isConfirmed
                                ? '1.5px solid rgba(72,187,120,0.35)'
                                : '1px solid rgba(229,193,88,0.2)',
                              padding: '20px',
                              boxShadow: isPending ? '0 4px 20px rgba(255,42,115,0.1)' : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#e5c158', letterSpacing: '0.5px' }}>
                                    #{b.booking_number}
                                  </span>
                                  {b.package_tier && (
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        background: 'rgba(229,193,88,0.15)',
                                        color: '#e5c158',
                                        border: '1px solid rgba(229,193,88,0.3)',
                                      }}
                                    >
                                      {b.package_tier} TIER
                                    </span>
                                  )}
                                  <span style={{ fontSize: '12px', color: '#718096' }}>
                                    Requested on {new Date(b.created_at).toLocaleDateString('en-IN')}
                                  </span>
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                                  {b.service_title || 'Wedding Service'}
                                  {b.package_name && <span style={{ color: '#a0aec0', fontSize: '14px', fontWeight: 400 }}> — {b.package_name}</span>}
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    background: isPending
                                      ? 'rgba(255,42,115,0.15)'
                                      : isAccepted
                                      ? 'rgba(99,179,237,0.15)'
                                      : isConfirmed
                                      ? 'rgba(72,187,120,0.15)'
                                      : isInProgress
                                      ? 'rgba(183,148,244,0.15)'
                                      : isCompleted
                                      ? 'rgba(229,193,88,0.18)'
                                      : 'rgba(252,129,129,0.15)',
                                    color: isPending
                                      ? '#ff80ab'
                                      : isAccepted
                                      ? '#63b3ed'
                                      : isConfirmed
                                      ? '#48bb78'
                                      : isInProgress
                                      ? '#b794f4'
                                      : isCompleted
                                      ? '#e5c158'
                                      : '#fc8181',
                                    border: `1px solid ${
                                      isPending
                                        ? 'rgba(255,42,115,0.4)'
                                        : isAccepted
                                        ? 'rgba(99,179,237,0.4)'
                                        : isConfirmed
                                        ? 'rgba(72,187,120,0.4)'
                                        : isInProgress
                                        ? 'rgba(183,148,244,0.4)'
                                        : isCompleted
                                        ? 'rgba(229,193,88,0.4)'
                                        : 'rgba(252,129,129,0.4)'
                                    }`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  {isPending && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff4d88' }} />}
                                  {b.status}
                                </span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '14px',
                                background: '#061d15',
                                borderRadius: '10px',
                                padding: '14px',
                                marginBottom: '16px',
                                border: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              {/* Client Info */}
                              <div>
                                <div style={{ fontSize: '11px', color: '#a0aec0', textTransform: 'uppercase', marginBottom: '2px' }}>Couple / Client</div>
                                <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{b.customer_name}</div>
                                <div style={{ fontSize: '12px', color: '#cbd5e0' }}>
                                  📞 {b.customer_phone || 'Private until confirmation'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#718096' }}>{b.customer_email}</div>
                              </div>

                              {/* Event Date & Location */}
                              <div>
                                <div style={{ fontSize: '11px', color: '#a0aec0', textTransform: 'uppercase', marginBottom: '2px' }}>Event Date & Venue</div>
                                <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>📅 {formattedDate}</div>
                                <div style={{ fontSize: '12px', color: '#cbd5e0' }}>
                                  📍 {b.event_location || 'Venue location not specified'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#718096' }}>👥 {b.guest_count} estimated guests</div>
                              </div>

                              {/* Inclusions / Add-ons Preview */}
                              <div>
                                <div style={{ fontSize: '11px', color: '#a0aec0', textTransform: 'uppercase', marginBottom: '2px' }}>Specifications</div>
                                <div style={{ color: '#fff', fontSize: '13px' }}>
                                  Package: <span style={{ color: '#e5c158', fontWeight: 600 }}>{b.package_name || 'Standard'}</span>
                                </div>
                                {b.add_ons && b.add_ons.length > 0 ? (
                                  <div style={{ fontSize: '11px', color: '#48bb78', marginTop: '2px' }}>
                                    ✨ {b.add_ons.length} Optional Add-on{b.add_ons.length > 1 ? 's' : ''} chosen
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Standard tier package inclusions</div>
                                )}
                              </div>

                              {/* Commercial Breakdown */}
                              <div>
                                <div style={{ fontSize: '11px', color: '#a0aec0', textTransform: 'uppercase', marginBottom: '2px' }}>Net Vendor Payout</div>
                                <div style={{ color: '#48bb78', fontWeight: '800', fontSize: '18px' }}>
                                  ₹{parseFloat(b.vendor_payout_amount || 0).toLocaleString('en-IN')}
                                </div>
                                <div style={{ fontSize: '11px', color: '#718096' }}>
                                  Gross: ₹{parseFloat(b.total_amount || 0).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>

                            {/* Actions & Utilities Bar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => handleOpenBookingDetail(b.id)}
                                  style={{
                                    padding: '8px 16px',
                                    background: 'rgba(229,193,88,0.12)',
                                    border: '1px solid rgba(229,193,88,0.3)',
                                    color: '#e5c158',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  <span>📄</span> View Full Dossier
                                </button>
                                <button
                                  onClick={() => handleOpenBookingChat(b)}
                                  style={{
                                    padding: '8px 16px',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  <span>💬</span> Chat with Client
                                </button>
                              </div>

                              {/* State Lifecycle Controls */}
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(b.id, 'ACCEPTED')}
                                      style={{
                                        padding: '8px 20px',
                                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        boxShadow: '0 2px 10px rgba(230,0,92,0.4)',
                                      }}
                                    >
                                      ✓ Accept Request
                                    </button>
                                    <button
                                      onClick={() => handleOpenDeclineModal(b)}
                                      style={{
                                        padding: '8px 16px',
                                        background: 'rgba(230,0,92,0.12)',
                                        border: '1px solid rgba(255,42,115,0.5)',
                                        color: '#ff80ab',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      ✕ Decline
                                    </button>
                                  </>
                                )}

                                {isAccepted && (
                                  <div
                                    style={{
                                      padding: '8px 14px',
                                      background: 'rgba(99,179,237,0.12)',
                                      border: '1px solid rgba(99,179,237,0.3)',
                                      borderRadius: '8px',
                                      color: '#63b3ed',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    ⏳ Awaiting Client Payment Confirmation
                                  </div>
                                )}

                                {isConfirmed && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(b.id, 'IN_PROGRESS')}
                                      style={{
                                        padding: '8px 20px',
                                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        boxShadow: '0 2px 10px rgba(230,0,92,0.4)',
                                      }}
                                    >
                                      🚀 Start Fulfillment
                                    </button>
                                    <button
                                      onClick={() => {
                                        const reason = prompt('Please enter a cancellation reason:');
                                        if (reason !== null && reason.trim()) {
                                          handleUpdateStatus(b.id, 'CANCELLED', reason.trim());
                                        }
                                      }}
                                      style={{
                                        padding: '8px 14px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        color: '#fc8181',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                      }}
                                    >
                                      Cancel Booking
                                    </button>
                                  </>
                                )}

                                {isInProgress && (
                                  <button
                                    onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                                    style={{
                                      padding: '8px 20px',
                                      background: 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      boxShadow: '0 2px 10px rgba(56,161,105,0.4)',
                                    }}
                                  >
                                    🎉 Mark as Completed
                                  </button>
                                )}

                                {isCompleted && (
                                  <div style={{ color: '#e5c158', fontSize: '13px', fontWeight: 600 }}>
                                    ✨ Fulfilled & Settled
                                  </div>
                                )}

                                {isCancelled && (
                                  <div style={{ color: '#fc8181', fontSize: '12px' }}>
                                    Closed / Released
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* MODAL 1: FULL BOOKING DETAILS DOSSIER */}
                {selectedBookingDetail && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.85)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        background: '#041710',
                        border: '1.5px solid rgba(229,193,88,0.35)',
                        borderRadius: '20px',
                        maxWidth: '820px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '32px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(229,193,88,0.1)',
                      }}
                    >
                      {/* Modal Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid rgba(229,193,88,0.2)', paddingBottom: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>📑</span>
                            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#e5c158', margin: 0 }}>
                              Booking Dossier #{selectedBookingDetail.booking_number}
                            </h3>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(229,193,88,0.15)',
                                color: '#e5c158',
                                border: '1px solid rgba(229,193,88,0.3)',
                              }}
                            >
                              {selectedBookingDetail.status}
                            </span>
                          </div>
                          <p style={{ color: '#a0aec0', fontSize: '13px', margin: '4px 0 0' }}>
                            Full client fulfillment specification and audit trail
                          </p>
                        </div>
                        <button
                          onClick={handleCloseBookingDetail}
                          style={{ background: 'none', border: 'none', color: '#a0aec0', fontSize: '24px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Visual Lifecycle Stepper */}
                      <div style={{ background: '#072218', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '12px', color: '#e5c158', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Fulfillment Progression Lifecycle
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                          {[
                            { key: 'REQUESTED', label: '1. Requested' },
                            { key: 'ACCEPTED', label: '2. Accepted' },
                            { key: 'CONFIRMED', label: '3. Confirmed' },
                            { key: 'IN_PROGRESS', label: '4. In Progress' },
                            { key: 'COMPLETED', label: '5. Completed' },
                          ].map((step, idx) => {
                            const statuses = ['REQUESTED', 'ACCEPTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
                            const currentIdx = statuses.indexOf(selectedBookingDetail.status);
                            const isCurrent = selectedBookingDetail.status === step.key;
                            const isPast = currentIdx >= idx;

                            return (
                              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                                <div
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: isCurrent
                                      ? '#ff2a73'
                                      : isPast
                                      ? '#48bb78'
                                      : '#1a3629',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    border: isCurrent ? '2px solid #fff' : 'none',
                                    boxShadow: isCurrent ? '0 0 12px rgba(255,42,115,0.6)' : 'none',
                                  }}
                                >
                                  {isPast && !isCurrent ? '✓' : idx + 1}
                                </div>
                                <div style={{ fontSize: '11px', marginTop: '6px', color: isCurrent ? '#ff80ab' : isPast ? '#48bb78' : '#718096', fontWeight: isCurrent ? 700 : 500, textAlign: 'center' }}>
                                  {step.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2-Column Dossier Layout */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        {/* Left: Client & Venue Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ background: '#072218', borderRadius: '12px', padding: '18px', border: '1px solid rgba(229,193,88,0.18)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5c158', marginBottom: '12px', textTransform: 'uppercase' }}>
                              Client & Fulfillment Details
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                              <div><strong style={{ color: '#a0aec0' }}>Client Name:</strong> <span style={{ color: '#fff' }}>{selectedBookingDetail.customer_name}</span></div>
                              <div><strong style={{ color: '#a0aec0' }}>Contact Phone:</strong> <span style={{ color: '#fff' }}>{selectedBookingDetail.customer_phone || 'Protected until confirmation'}</span></div>
                              <div><strong style={{ color: '#a0aec0' }}>Email Address:</strong> <span style={{ color: '#fff' }}>{selectedBookingDetail.customer_email || 'Protected'}</span></div>
                              <div><strong style={{ color: '#a0aec0' }}>Event Date:</strong> <span style={{ color: '#e5c158', fontWeight: 600 }}>{new Date(selectedBookingDetail.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                              <div><strong style={{ color: '#a0aec0' }}>Venue Location:</strong> <span style={{ color: '#fff' }}>{selectedBookingDetail.event_location || 'Not specified'}</span></div>
                              <div><strong style={{ color: '#a0aec0' }}>Guest Count:</strong> <span style={{ color: '#fff' }}>{selectedBookingDetail.guest_count} guests</span></div>
                              {selectedBookingDetail.special_instructions && (
                                <div style={{ marginTop: '8px', padding: '10px', background: '#0a2a1c', borderRadius: '8px', border: '1px solid rgba(229,193,88,0.2)' }}>
                                  <div style={{ fontSize: '11px', color: '#e5c158', fontWeight: 700, marginBottom: '4px' }}>SPECIAL NOTES FROM CLIENT:</div>
                                  <div style={{ color: '#e2e8f0', fontSize: '12px', fontStyle: 'italic' }}>"{selectedBookingDetail.special_instructions}"</div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Service & Package Breakdown */}
                          <div style={{ background: '#072218', borderRadius: '12px', padding: '18px', border: '1px solid rgba(229,193,88,0.18)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5c158', marginBottom: '12px', textTransform: 'uppercase' }}>
                              Service & Package Specification
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                              {selectedBookingDetail.service_title}
                            </div>
                            {selectedBookingDetail.package_name && (
                              <div style={{ fontSize: '13px', color: '#e5c158', marginBottom: '8px' }}>
                                Tier: {selectedBookingDetail.package_name} ({selectedBookingDetail.package_tier})
                              </div>
                            )}
                            {selectedBookingDetail.package_description && (
                              <p style={{ fontSize: '12px', color: '#a0aec0', margin: '0 0 10px' }}>
                                {selectedBookingDetail.package_description}
                              </p>
                            )}

                            {/* Inclusions */}
                            {selectedBookingDetail.package_inclusions && selectedBookingDetail.package_inclusions.length > 0 && (
                              <div style={{ marginTop: '8px' }}>
                                <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 700, marginBottom: '6px' }}>INCLUDED FEATURES:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {selectedBookingDetail.package_inclusions.map((inc: string, i: number) => (
                                    <div key={i} style={{ fontSize: '12px', color: '#cbd5e0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ color: '#48bb78' }}>✓</span> {inc}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Add-ons */}
                            {selectedBookingDetail.add_ons && selectedBookingDetail.add_ons.length > 0 && (
                              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: '11px', color: '#e5c158', fontWeight: 700, marginBottom: '6px' }}>SELECTED OPTIONAL ADD-ONS:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {selectedBookingDetail.add_ons.map((addon: any, i: number) => (
                                    <div key={i} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: '#fff', background: '#0a251b', padding: '6px 10px', borderRadius: '6px' }}>
                                      <span>+ {addon.name}</span>
                                      <span style={{ color: '#48bb78', fontWeight: 600 }}>₹{parseFloat(addon.price || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Commercial Summary & Status Audit Timeline */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Commercial Summary */}
                          <div style={{ background: '#072218', borderRadius: '12px', padding: '18px', border: '1px solid rgba(229,193,88,0.18)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5c158', marginBottom: '12px', textTransform: 'uppercase' }}>
                              Commercial Settlement Breakdown
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e0' }}>
                                <span>Gross Booking Price:</span>
                                <span>₹{parseFloat(selectedBookingDetail.total_amount || 0).toLocaleString('en-IN')}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a0aec0' }}>
                                <span>Platform Service Fee:</span>
                                <span>- ₹{parseFloat(selectedBookingDetail.commission_amount || 0).toLocaleString('en-IN')}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#48bb78', fontWeight: 700, fontSize: '16px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <span>Net Vendor Settlement:</span>
                                <span>₹{parseFloat(selectedBookingDetail.vendor_payout_amount || 0).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Audit Trail Timeline */}
                          <div style={{ background: '#072218', borderRadius: '12px', padding: '18px', border: '1px solid rgba(229,193,88,0.18)', flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5c158', marginBottom: '12px', textTransform: 'uppercase' }}>
                              Status Audit History
                            </div>
                            {(!selectedBookingDetail.status_history || selectedBookingDetail.status_history.length === 0) ? (
                              <div style={{ color: '#718096', fontSize: '12px', fontStyle: 'italic' }}>Initial booking status recorded.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {selectedBookingDetail.status_history.map((hist: any, i: number) => (
                                  <div key={i} style={{ borderLeft: '2px solid #e5c158', paddingLeft: '10px', fontSize: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e0' }}>
                                      <span>
                                        <strong style={{ color: '#fff' }}>{hist.to_status}</strong>
                                        {hist.from_status && <span style={{ color: '#718096' }}> (from {hist.from_status})</span>}
                                      </span>
                                      <span style={{ fontSize: '10px', color: '#718096' }}>
                                        {new Date(hist.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <div style={{ color: '#a0aec0', fontSize: '11px', marginTop: '2px' }}>
                                      Updated by: {hist.changed_by || 'System'}
                                    </div>
                                    {hist.reason && (
                                      <div style={{ color: '#fc8181', fontSize: '11px', marginTop: '2px', fontStyle: 'italic' }}>
                                        Reason: "{hist.reason}"
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Modal Footer Controls */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(229,193,88,0.2)' }}>
                        <button
                          onClick={() => {
                            handleCloseBookingDetail();
                            handleOpenBookingChat(selectedBookingDetail);
                          }}
                          style={{
                            padding: '10px 18px',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          💬 Send Message to Client
                        </button>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          {['REQUESTED', 'PENDING_VENDOR', 'PENDING'].includes(selectedBookingDetail.status) && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(selectedBookingDetail.id, 'ACCEPTED')}
                                style={{
                                  padding: '10px 22px',
                                  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Accept Booking
                              </button>
                              <button
                                onClick={() => {
                                  handleOpenDeclineModal(selectedBookingDetail);
                                  handleCloseBookingDetail();
                                }}
                                style={{
                                  padding: '10px 18px',
                                  background: 'rgba(230,0,92,0.15)',
                                  border: '1px solid #ff2a73',
                                  color: '#ff80ab',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Decline Request
                              </button>
                            </>
                          )}
                          <button
                            onClick={handleCloseBookingDetail}
                            style={{
                              padding: '10px 18px',
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              color: '#a0aec0',
                              borderRadius: '8px',
                              fontSize: '13px',
                              cursor: 'pointer',
                            }}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL 2: DECLINE REQUEST CONFIRMATION MODAL */}
                {declineBookingModalItem && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.85)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        background: '#041710',
                        border: '1.5px solid rgba(255,42,115,0.4)',
                        borderRadius: '20px',
                        maxWidth: '520px',
                        width: '100%',
                        padding: '28px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(255,42,115,0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#ff80ab', margin: 0 }}>
                          Decline Booking Request
                        </h3>
                      </div>
                      <p style={{ color: '#a0aec0', fontSize: '13px', marginBottom: '18px' }}>
                        You are about to decline booking #{declineBookingModalItem.booking_number} from {declineBookingModalItem.customer_name}.
                        Declining releases any tentative calendar holds and alerts the couple immediately.
                      </p>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                          PRIMARY REASON FOR DECLINING
                        </label>
                        <select
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: '#0a251b',
                            border: '1px solid rgba(229,193,88,0.3)',
                            color: '#fff',
                            fontSize: '13px',
                          }}
                        >
                          <option value="Date unavailable / Fully committed">Date unavailable / Fully committed</option>
                          <option value="Venue outside operating radius">Venue outside operating radius</option>
                          <option value="Service requirements exceed capacity">Service requirements exceed capacity</option>
                          <option value="Pricing / custom quote mismatch">Pricing / custom quote mismatch</option>
                          <option value="Personal leave / scheduled maintenance">Personal leave / scheduled maintenance</option>
                          <option value="Other reason">Other reason</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '22px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                          ADDITIONAL NOTES (SENT TO CLIENT)
                        </label>
                        <textarea
                          rows={3}
                          value={declineCustomNote}
                          onChange={(e) => setDeclineCustomNote(e.target.value)}
                          placeholder="Optional polite note explaining why you cannot accept this date..."
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: '#0a251b',
                            border: '1px solid rgba(229,193,88,0.3)',
                            color: '#fff',
                            fontSize: '13px',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setDeclineBookingModalItem(null)}
                          style={{
                            padding: '10px 18px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#a0aec0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={submittingDecline}
                          onClick={handleConfirmDecline}
                          style={{
                            padding: '10px 22px',
                            background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {submittingDecline ? 'Declining...' : 'Confirm Decline & Release Date'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL 3: DIRECT BOOKING MESSAGING CHAT MODAL */}
                {chatModalBooking && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.85)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        background: '#041710',
                        border: '1.5px solid rgba(229,193,88,0.35)',
                        borderRadius: '20px',
                        maxWidth: '640px',
                        width: '100%',
                        height: '75vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(229,193,88,0.15)',
                      }}
                    >
                      {/* Chat Header */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #072218 0%, #031710 100%)',
                          borderBottom: '1px solid rgba(229,193,88,0.2)',
                          padding: '16px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff2a73, #e6005c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '16px' }}>
                            {chatModalBooking.customer_name ? chatModalBooking.customer_name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                              {chatModalBooking.customer_name}
                            </div>
                            <div style={{ color: '#e5c158', fontSize: '12px' }}>
                              Booking #{chatModalBooking.booking_number} • {chatModalBooking.service_title}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setChatModalBooking(null)}
                          style={{ background: 'none', border: 'none', color: '#a0aec0', fontSize: '22px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Chat Messages Body */}
                      <div
                        style={{
                          flex: 1,
                          padding: '20px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          background: '#03140e',
                        }}
                      >
                        {loadingChat ? (
                          <div style={{ textAlign: 'center', color: '#a0aec0', padding: '40px 0' }}>
                            Connecting to secure conversation channel...
                          </div>
                        ) : chatMessages.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#718096', padding: '60px 20px' }}>
                            <div style={{ fontSize: '36px', marginBottom: '10px' }}>💬</div>
                            <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                              Direct Wedding Messaging
                            </div>
                            <p style={{ fontSize: '12px', maxWidth: '340px', margin: '0 auto' }}>
                              Coordinate event logistics, answer questions about package inclusions, and discuss custom requirements directly with the client.
                            </p>
                          </div>
                        ) : (
                          chatMessages.map((msg: any, i: number) => {
                            const isMe = msg.sender_role === 'VENDOR' || msg.sender_id === vendorData?.id;
                            return (
                              <div
                                key={msg.id || i}
                                style={{
                                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                                  maxWidth: '75%',
                                }}
                              >
                                <div
                                  style={{
                                    background: isMe
                                      ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)'
                                      : '#0a251b',
                                    color: '#fff',
                                    padding: '10px 14px',
                                    borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                    fontSize: '13px',
                                    border: isMe ? 'none' : '1px solid rgba(229,193,88,0.2)',
                                    boxShadow: isMe ? '0 2px 8px rgba(230,0,92,0.3)' : 'none',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {msg.body}
                                </div>
                                <div
                                  style={{
                                    fontSize: '10px',
                                    color: '#718096',
                                    marginTop: '4px',
                                    textAlign: isMe ? 'right' : 'left',
                                    padding: '0 4px',
                                  }}
                                >
                                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </div>
                              </div>
                            );
                          })
                        )}
                        {chatError && (
                          <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #ff2a73', color: '#ff80ab', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}>
                            {chatError}
                          </div>
                        )}
                      </div>

                      {/* Chat Input Footer */}
                      <form
                        onSubmit={handleSendBookingChatMessage}
                        style={{
                          background: '#041710',
                          borderTop: '1px solid rgba(229,193,88,0.2)',
                          padding: '14px 18px',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                        }}
                      >
                        <input
                          type="text"
                          value={chatNewMessage}
                          onChange={(e) => setChatNewMessage(e.target.value)}
                          placeholder="Type a message to the couple..."
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            background: '#0a251b',
                            border: '1px solid rgba(229,193,88,0.3)',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="submit"
                          disabled={sendingChatMessage || !chatNewMessage.trim()}
                          style={{
                            padding: '10px 18px',
                            background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            opacity: sendingChatMessage || !chatNewMessage.trim() ? 0.6 : 1,
                            boxShadow: '0 2px 10px rgba(230,0,92,0.35)',
                          }}
                        >
                          {sendingChatMessage ? 'Sending...' : 'Send'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ================= TAB 6: PORTFOLIO & REELS ================= */}
          {activeTab === 'portfolio' && (
            <div>
              {/* Top Banner & Storage Quota Meter */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #072218 0%, #031710 100%)',
                  borderRadius: '20px',
                  border: '1.5px solid rgba(229,193,88,0.3)',
                  padding: '28px',
                  marginBottom: '28px',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '24px' }}>📸</span>
                      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                        Wedding Showcase & Portfolio
                      </h2>
                    </div>
                    <p style={{ fontSize: '14px', color: '#a0aec0', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
                      Showcase your finest ceremony photographs, decor setups, and 4K wedding highlight videos. Verified high-resolution visual media attracts up to 3x more confirmed couple inquiries.
                    </p>
                  </div>

                  {/* Upload Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal('IMAGE')}
                      style={{
                        padding: '11px 20px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 16px rgba(230,0,92,0.4)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <span>📷</span>
                      <span>Upload Wedding Photos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal('VIDEO')}
                      style={{
                        padding: '11px 20px',
                        background: 'rgba(229,193,88,0.12)',
                        color: '#e5c158',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        border: '1.5px solid rgba(229,193,88,0.4)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span>🎥</span>
                      <span>Upload Video Reel</span>
                    </button>
                  </div>
                </div>

                {/* KPI Metrics & Storage Meter Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(229,193,88,0.15)',
                  }}
                >
                  <div style={{ background: '#0a251b', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.15)' }}>
                    <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 600, letterSpacing: '0.5px' }}>WEDDING PHOTOS</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#e5c158', marginTop: '4px' }}>
                      {portfolios.filter((p: any) => p.media_type === 'IMAGE').length}
                    </div>
                  </div>

                  <div style={{ background: '#0a251b', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.15)' }}>
                    <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 600, letterSpacing: '0.5px' }}>VIDEO SHOWCASES</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#ff4d79', marginTop: '4px' }}>
                      {portfolios.filter((p: any) => p.media_type === 'VIDEO').length}
                    </div>
                  </div>

                  <div style={{ background: '#0a251b', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.15)' }}>
                    <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 600, letterSpacing: '0.5px' }}>IN COMPLIANCE REVIEW</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#ecc94b', marginTop: '4px' }}>
                      {portfolios.filter((p: any) => p.moderation_status === 'PENDING_REVIEW').length}
                    </div>
                  </div>

                  <div style={{ background: '#0a251b', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 600, letterSpacing: '0.5px' }}>STORAGE QUOTA</span>
                      <span style={{ fontSize: '11px', color: '#e5c158', fontWeight: 700 }}>
                        {portfolioStats ? portfolioStats.used_mb : 0} MB / {portfolioStats ? portfolioStats.max_quota_mb : 250} MB
                      </span>
                    </div>
                    {/* Quota Progress Bar */}
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${portfolioStats ? portfolioStats.quota_percentage : 0}%`,
                          background: 'linear-gradient(90deg, #48bb78 0%, #e5c158 70%, #ff2a73 100%)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#718096', marginTop: '5px' }}>
                      {portfolioStats ? (100 - portfolioStats.quota_percentage).toFixed(0) : 100}% remaining capacity
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `All Media (${portfolios.length})` },
                    { id: 'image', label: `📷 Photos (${portfolios.filter((p: any) => p.media_type === 'IMAGE').length})` },
                    { id: 'video', label: `🎥 Videos (${portfolios.filter((p: any) => p.media_type === 'VIDEO').length})` },
                    { id: 'pending', label: `⏳ Pending (${portfolios.filter((p: any) => p.moderation_status === 'PENDING_REVIEW').length})` },
                    { id: 'approved', label: `✓ Approved (${portfolios.filter((p: any) => p.moderation_status === 'APPROVED').length})` },
                  ].map((tab) => {
                    const isActive = portfolioFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPortfolioFilter(tab.id as any)}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '20px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isActive ? '1px solid #e5c158' : '1px solid rgba(255,255,255,0.12)',
                          background: isActive ? 'rgba(229,193,88,0.18)' : 'rgba(255,255,255,0.04)',
                          color: isActive ? '#e5c158' : '#cbd5e0',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: '12px', color: '#718096' }}>
                  Showing {portfolios.filter((item: any) => {
                    if (portfolioFilter === 'image') return item.media_type === 'IMAGE';
                    if (portfolioFilter === 'video') return item.media_type === 'VIDEO';
                    if (portfolioFilter === 'pending') return item.moderation_status === 'PENDING_REVIEW';
                    if (portfolioFilter === 'approved') return item.moderation_status === 'APPROVED';
                    return true;
                  }).length} items
                </div>
              </div>

              {/* Portfolio Grid */}
              {portfolios.filter((item: any) => {
                if (portfolioFilter === 'image') return item.media_type === 'IMAGE';
                if (portfolioFilter === 'video') return item.media_type === 'VIDEO';
                if (portfolioFilter === 'pending') return item.moderation_status === 'PENDING_REVIEW';
                if (portfolioFilter === 'approved') return item.moderation_status === 'APPROVED';
                return true;
              }).length === 0 ? (
                /* Empty State */
                <div
                  style={{
                    background: '#061d15',
                    borderRadius: '16px',
                    border: '1.5px dashed rgba(229,193,88,0.3)',
                    padding: '48px 24px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷✨</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                    No Portfolio Media in this View
                  </h3>
                  <p style={{ fontSize: '13.5px', color: '#a0aec0', maxWidth: '480px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
                    Showcase ceremony photographs, mandap decor, and high-definition video reels so wedding couples can visualize your exceptional work.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal('IMAGE')}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      + Upload First Wedding Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal('VIDEO')}
                      style={{
                        padding: '10px 20px',
                        background: 'rgba(229,193,88,0.12)',
                        color: '#e5c158',
                        fontWeight: 700,
                        fontSize: '13px',
                        border: '1px solid rgba(229,193,88,0.4)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      + Upload Wedding Video
                    </button>
                  </div>
                </div>
              ) : (
                /* Media Cards Grid */
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '20px',
                  }}
                >
                  {portfolios
                    .filter((item: any) => {
                      if (portfolioFilter === 'image') return item.media_type === 'IMAGE';
                      if (portfolioFilter === 'video') return item.media_type === 'VIDEO';
                      if (portfolioFilter === 'pending') return item.moderation_status === 'PENDING_REVIEW';
                      if (portfolioFilter === 'approved') return item.moderation_status === 'APPROVED';
                      return true;
                    })
                    .map((item: any) => {
                      const isVideo = item.media_type === 'VIDEO';
                      const isCover = item.is_cover;
                      const status = item.moderation_status || 'PENDING_REVIEW';

                      return (
                        <div
                          key={item.id}
                          style={{
                            background: '#061d15',
                            borderRadius: '16px',
                            border: isCover ? '2px solid #e5c158' : '1px solid rgba(229,193,88,0.2)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: isCover ? '0 8px 24px rgba(229,193,88,0.18)' : '0 4px 16px rgba(0,0,0,0.4)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                          }}
                        >
                          {/* Media Preview Container */}
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '190px',
                              background: '#000',
                              cursor: 'pointer',
                              overflow: 'hidden',
                            }}
                            onClick={() => setSelectedPreviewMedia(item)}
                          >
                            {isVideo ? (
                              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                {item.thumbnail_url ? (
                                  <img
                                    src={item.thumbnail_url}
                                    alt={item.title || 'Video Reel'}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      background: 'linear-gradient(135deg, #072218 0%, #03140e 100%)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <video
                                      src={item.media_url || item.image_url}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      muted
                                      playsInline
                                    />
                                  </div>
                                )}
                                {/* Play Overlay */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '46px',
                                      height: '46px',
                                      borderRadius: '50%',
                                      background: 'rgba(255,42,115,0.9)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontSize: '20px',
                                      paddingLeft: '3px',
                                      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                                    }}
                                  >
                                    ▶
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <img
                                src={item.media_url || item.image_url}
                                alt={item.title || 'Portfolio Image'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                              />
                            )}

                            {/* Top Left: Media Type Tag */}
                            <div
                              style={{
                                position: 'absolute',
                                top: '10px',
                                left: '10px',
                                background: isVideo ? 'rgba(255,42,115,0.85)' : 'rgba(3,23,16,0.85)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backdropFilter: 'blur(4px)',
                              }}
                            >
                              {isVideo ? '🎥 VIDEO' : '📷 PHOTO'}
                            </div>

                            {/* Top Right: Cover Photo Badge */}
                            {isCover && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '10px',
                                  right: '10px',
                                  background: 'linear-gradient(135deg, #e5c158 0%, #b8932f 100%)',
                                  color: '#031710',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                }}
                              >
                                ⭐ STOREFRONT COVER
                              </div>
                            )}

                            {/* Bottom Right: Moderation Badge */}
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '10px',
                                right: '10px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px',
                                background:
                                  status === 'APPROVED'
                                    ? 'rgba(56,161,105,0.9)'
                                    : status === 'REJECTED'
                                    ? 'rgba(229,62,62,0.9)'
                                    : 'rgba(214,158,46,0.9)',
                                color: '#fff',
                                backdropFilter: 'blur(4px)',
                              }}
                            >
                              {status === 'APPROVED' ? '✓ Approved' : status === 'REJECTED' ? '✕ Rejected' : '⏳ In Review'}
                            </div>
                          </div>

                          {/* Card Content & Metadata */}
                          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                <strong style={{ fontSize: '14.5px', color: '#fff', fontWeight: 700 }}>
                                  {item.title || (isVideo ? 'Wedding Showcase Reel' : 'Ceremony Photograph')}
                                </strong>
                              </div>

                              {item.caption && (
                                <p style={{ fontSize: '12.5px', color: '#cbd5e0', margin: '0 0 8px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {item.caption}
                                </p>
                              )}

                              {item.service_title && (
                                <div style={{ fontSize: '11px', color: '#e5c158', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>🏷️</span>
                                  <span>{item.service_title}</span>
                                </div>
                              )}

                              {/* Rejection Alert if Rejected */}
                              {status === 'REJECTED' && item.rejection_reason && (
                                <div style={{ padding: '8px 10px', background: 'rgba(229,62,62,0.15)', border: '1px solid rgba(229,62,62,0.3)', borderRadius: '6px', fontSize: '11px', color: '#feb2b2', marginBottom: '10px' }}>
                                  <strong>Feedback:</strong> {item.rejection_reason}
                                </div>
                              )}

                              <div style={{ fontSize: '11px', color: '#718096', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{(item.file_size / (1024 * 1024)).toFixed(1)} MB</span>
                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Card Actions Footer */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '14px',
                                paddingTop: '12px',
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPreviewMedia(item)}
                                  title="Inspect Full Size"
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: '#cbd5e0',
                                    fontSize: '11.5px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  🔍 View
                                </button>

                                {!isVideo && !isCover && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetCoverPhoto(item.id)}
                                    title="Set as Main Storefront Cover"
                                    style={{
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      background: 'rgba(229,193,88,0.12)',
                                      border: '1px solid rgba(229,193,88,0.3)',
                                      color: '#e5c158',
                                      fontSize: '11.5px',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                    }}
                                  >
                                    ⭐ Make Cover
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleToggleMediaActive(item)}
                                  title={item.is_active ? 'Pause visibility' : 'Activate visibility'}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: item.is_active ? '#48bb78' : '#a0aec0',
                                    fontSize: '11.5px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {item.is_active ? 'Active' : 'Paused'}
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={deletingMediaId === item.id}
                                onClick={() => handleDeletePortfolioItem(item.id)}
                                title="Delete media"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(229,62,62,0.12)',
                                  border: '1px solid rgba(229,62,62,0.3)',
                                  color: '#feb2b2',
                                  fontSize: '11.5px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                {deletingMediaId === item.id ? 'Deleting...' : '🗑️'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ================= PORTFOLIO UPLOAD MODAL ================= */}
          {showUploadModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                zIndex: 9999,
              }}
              onClick={() => {
                if (!uploadingMedia) setShowUploadModal(false);
              }}
            >
              <div
                style={{
                  maxWidth: '560px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  background: 'linear-gradient(180deg, #072218 0%, #031710 100%)',
                  border: '1.5px solid rgba(229,193,88,0.4)',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.8), 0 0 30px rgba(229,193,88,0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{uploadMediaType === 'VIDEO' ? '🎥' : '📷'}</span>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#e5c158', margin: 0 }}>
                      Upload {uploadMediaType === 'VIDEO' ? 'Wedding Showcase Video' : 'Wedding Showcase Photo'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploadingMedia}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a0aec0',
                      fontSize: '20px',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Media Type Switcher Tabs */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMediaType('IMAGE');
                      setUploadFile(null);
                      setUploadPreviewUrl(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: uploadMediaType === 'IMAGE' ? '1.5px solid #e5c158' : '1px solid rgba(255,255,255,0.15)',
                      background: uploadMediaType === 'IMAGE' ? 'rgba(229,193,88,0.18)' : 'rgba(255,255,255,0.04)',
                      color: uploadMediaType === 'IMAGE' ? '#e5c158' : '#cbd5e0',
                    }}
                  >
                    📷 High-Res Photo (Max 15MB)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMediaType('VIDEO');
                      setUploadFile(null);
                      setUploadPreviewUrl(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: uploadMediaType === 'VIDEO' ? '1.5px solid #ff2a73' : '1px solid rgba(255,255,255,0.15)',
                      background: uploadMediaType === 'VIDEO' ? 'rgba(255,42,115,0.18)' : 'rgba(255,255,255,0.04)',
                      color: uploadMediaType === 'VIDEO' ? '#ff4d79' : '#cbd5e0',
                    }}
                  >
                    🎥 Video Reel (Max 60MB)
                  </button>
                </div>

                {/* Upload Form */}
                <form onSubmit={handleSubmitPortfolioUpload}>
                  {uploadError && (
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(229,62,62,0.2)', border: '1px solid #e53e3e', color: '#feb2b2', fontSize: '13px', marginBottom: '16px' }}>
                      ⚠️ {uploadError}
                    </div>
                  )}

                  {uploadSuccess && (
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(56,161,105,0.2)', border: '1px solid #38a169', color: '#9ae6b4', fontSize: '13px', marginBottom: '16px' }}>
                      {uploadSuccess}
                    </div>
                  )}

                  {/* File Dropzone Area */}
                  <div
                    style={{
                      border: '2px dashed rgba(229,193,88,0.4)',
                      borderRadius: '12px',
                      padding: '24px',
                      textAlign: 'center',
                      background: 'rgba(10,37,27,0.6)',
                      marginBottom: '18px',
                      position: 'relative',
                    }}
                  >
                    <input
                      type="file"
                      id="portfolioFilePicker"
                      accept={uploadMediaType === 'VIDEO' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif,image/heic'}
                      onChange={handlePortfolioFileSelect}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                      }}
                    />

                    {uploadPreviewUrl ? (
                      <div>
                        {uploadMediaType === 'VIDEO' ? (
                          <video
                            src={uploadPreviewUrl}
                            controls
                            style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px' }}
                          />
                        ) : (
                          <img
                            src={uploadPreviewUrl}
                            alt="Upload preview"
                            style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px' }}
                          />
                        )}
                        <div style={{ fontSize: '12px', color: '#e5c158', marginTop: '8px', fontWeight: 600 }}>
                          ✓ {uploadFile?.name} ({(uploadFile?.size ? uploadFile.size / (1024 * 1024) : 0).toFixed(2)} MB)
                        </div>
                        <span style={{ fontSize: '11px', color: '#a0aec0' }}>Click to select a different file</span>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                          {uploadMediaType === 'VIDEO' ? '🎬' : '🖼️'}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                          Choose or Drag {uploadMediaType === 'VIDEO' ? 'Video' : 'Photo'} File
                        </div>
                        <p style={{ fontSize: '12px', color: '#a0aec0', margin: '0 0 8px 0' }}>
                          {uploadMediaType === 'VIDEO'
                            ? 'MP4, WebM, MOV format up to 60MB'
                            : 'JPG, PNG, WebP, GIF, HEIC format up to 15MB'}
                        </p>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            background: 'rgba(229,193,88,0.2)',
                            color: '#e5c158',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          Browse Device Files
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Video Thumbnail (Optional) */}
                  {uploadMediaType === 'VIDEO' && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>
                        VIDEO POSTER THUMBNAIL (OPTIONAL)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailFileSelect}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '8px',
                          background: '#0a251b',
                          border: '1px solid rgba(229,193,88,0.3)',
                          color: '#cbd5e0',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                  )}

                  {/* Title Input */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>
                      SHOWCASE TITLE
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Royal Lake Palace Mandap Ceremony"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: '#0a251b',
                        border: '1px solid rgba(229,193,88,0.3)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Caption Input */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>
                      CAPTION / STORY
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief note on the wedding venue, couple styling, or ceremony highlights..."
                      value={uploadCaption}
                      onChange={(e) => setUploadCaption(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: '#0a251b',
                        border: '1px solid rgba(229,193,88,0.3)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Service Association Dropdown */}
                  {services.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>
                        LINK TO WEDDING SERVICE (OPTIONAL)
                      </label>
                      <select
                        value={uploadServiceId}
                        onChange={(e) => setUploadServiceId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: '#0a251b',
                          border: '1px solid rgba(229,193,88,0.3)',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      >
                        <option value="">General Showcase (No specific service link)</option>
                        {services.map((srv: any) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.title} ({srv.category_name || 'Service'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cover Photo Toggle (Images Only) */}
                  {uploadMediaType === 'IMAGE' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
                      <input
                        type="checkbox"
                        id="uploadIsCoverCheck"
                        checked={uploadIsCover}
                        onChange={(e) => setUploadIsCover(e.target.checked)}
                        style={{ accentColor: '#e5c158', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="uploadIsCoverCheck" style={{ fontSize: '13px', color: '#cbd5e0', cursor: 'pointer' }}>
                        ⭐ Set as Primary Storefront Cover Photo
                      </label>
                    </div>
                  )}

                  {/* Modal Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      disabled={uploadingMedia}
                      onClick={() => setShowUploadModal(false)}
                      style={{
                        padding: '10px 18px',
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
                      disabled={uploadingMedia || !uploadFile}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        border: 'none',
                        cursor: uploadingMedia || !uploadFile ? 'not-allowed' : 'pointer',
                        opacity: uploadingMedia || !uploadFile ? 0.6 : 1,
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      {uploadingMedia ? 'Uploading Media...' : 'Upload & Submit for Review'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= PORTFOLIO LIGHTBOX / MEDIA VIEWER ================= */}
          {selectedPreviewMedia && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.92)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                zIndex: 10000,
              }}
              onClick={() => setSelectedPreviewMedia(null)}
            >
              <div
                style={{
                  maxWidth: '900px',
                  width: '100%',
                  background: '#072218',
                  border: '1.5px solid rgba(229,193,88,0.35)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Media Preview Box */}
                <div style={{ background: '#000', maxHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {selectedPreviewMedia.media_type === 'VIDEO' ? (
                    <video
                      src={selectedPreviewMedia.media_url || selectedPreviewMedia.image_url}
                      controls
                      autoPlay
                      playsInline
                      style={{ width: '100%', maxHeight: '500px', outline: 'none' }}
                    />
                  ) : (
                    <img
                      src={selectedPreviewMedia.media_url || selectedPreviewMedia.image_url}
                      alt={selectedPreviewMedia.title || 'Wedding Portfolio Still'}
                      style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }}
                    />
                  )}

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setSelectedPreviewMedia(null)}
                    style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.7)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontSize: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Media Details Footer */}
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                          {selectedPreviewMedia.title || (selectedPreviewMedia.media_type === 'VIDEO' ? 'Wedding Showcase Reel' : 'Ceremony Photograph')}
                        </h3>
                        {selectedPreviewMedia.is_cover && (
                          <span style={{ fontSize: '10.5px', background: '#e5c158', color: '#031710', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                            ⭐ COVER
                          </span>
                        )}
                      </div>
                      {selectedPreviewMedia.caption && (
                        <p style={{ fontSize: '13.5px', color: '#cbd5e0', margin: '4px 0 8px 0', lineHeight: 1.5 }}>
                          {selectedPreviewMedia.caption}
                        </p>
                      )}
                      {selectedPreviewMedia.service_title && (
                        <div style={{ fontSize: '12px', color: '#e5c158' }}>
                          🏷️ Associated with: <strong>{selectedPreviewMedia.service_title}</strong>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          background:
                            selectedPreviewMedia.moderation_status === 'APPROVED'
                              ? 'rgba(56,161,105,0.2)'
                              : selectedPreviewMedia.moderation_status === 'REJECTED'
                              ? 'rgba(229,62,62,0.2)'
                              : 'rgba(214,158,46,0.2)',
                          color:
                            selectedPreviewMedia.moderation_status === 'APPROVED'
                              ? '#48bb78'
                              : selectedPreviewMedia.moderation_status === 'REJECTED'
                              ? '#f56565'
                              : '#ecc94b',
                          border:
                            selectedPreviewMedia.moderation_status === 'APPROVED'
                              ? '1px solid #38a169'
                              : selectedPreviewMedia.moderation_status === 'REJECTED'
                              ? '1px solid #e53e3e'
                              : '1px solid #d69e2e',
                        }}
                      >
                        {selectedPreviewMedia.moderation_status === 'APPROVED'
                          ? '✓ Approved for Storefront'
                          : selectedPreviewMedia.moderation_status === 'REJECTED'
                          ? '✕ Review Rejected'
                          : '⏳ In Review'}
                      </span>
                      <div style={{ fontSize: '11px', color: '#718096', marginTop: '6px' }}>
                        Uploaded {new Date(selectedPreviewMedia.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {selectedPreviewMedia.moderation_status === 'REJECTED' && selectedPreviewMedia.rejection_reason && (
                    <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(229,62,62,0.12)', border: '1px solid rgba(229,62,62,0.3)', color: '#feb2b2', fontSize: '12.5px' }}>
                      <strong>Reviewer Feedback:</strong> {selectedPreviewMedia.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Package Comparison Preview Modal */}
          <PackageComparisonModal
            isOpen={showComparisonModal}
            vendorId={vendorData?.id}
            serviceId={comparisonServiceId}
            previewMode={true}
            onClose={() => setShowComparisonModal(false)}
          />
        </main>
      </div>
    </div>
  );
}
