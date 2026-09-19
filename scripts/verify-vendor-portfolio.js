const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== Starting Vendor Portfolio & Media Management Verification Test Suite ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Helper: Parse cookie from response
    function getCookie(res) {
      const setCookie = res.headers.get('set-cookie');
      if (!setCookie) return '';
      return setCookie.split(';')[0];
    }

    // Helper: register vendor user
    async function registerVendor(name, email, businessName, categoryId) {
      const randomPhone = '91' + Math.floor(10000000 + Math.random() * 90000000);
      const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: randomPhone,
          password: 'Password@123',
          role: 'VENDOR',
          business_name: businessName,
          category_id: categoryId,
          city: 'Jodhpur',
          address: '45 Blue City Fort Road, Jodhpur',
          description: 'Destination wedding visuals, candid storytelling and cinematography.',
          starting_price: 45000,
        })
      });

      const data = await regRes.json();
      if (!regRes.ok) {
        throw new Error(`Vendor registration failed: ${JSON.stringify(data)}`);
      }
      const cookie = getCookie(regRes);
      return { cookie, user: data.user, vendorId: data.user.vendor_id };
    }

    // Helper: login admin
    async function loginAdmin() {
      const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@wedwithme.com', password: 'Password@123' }),
      });
      const data = await adminLoginRes.json();
      if (!adminLoginRes.ok) {
        throw new Error(`Admin login failed: ${JSON.stringify(data)}`);
      }
      return getCookie(adminLoginRes);
    }

    const timestamp = Date.now();
    const vendorAEmail = `vendor_pf_a_${timestamp}@wedwithme.com`;
    const vendorBEmail = `vendor_pf_b_${timestamp}@wedwithme.com`;

    // 1. Fetch categories & setup
    console.log('1. Fetching platform categories...');
    const catRes = await fetch(`${BASE_URL}/api/categories`);
    const catJson = await catRes.json();
    assert(catJson.success && Array.isArray(catJson.data) && catJson.data.length > 0, 'Fetched platform categories successfully');
    const validCategory = catJson.data[0];

    // 2. Register and authenticate Vendor A
    console.log('\n2. Registering and authenticating Vendor A...');
    const vendorA = await registerVendor(
      'Rohan Singhania ' + timestamp,
      vendorAEmail,
      'Singhania Wedding Frames ' + timestamp,
      validCategory.id
    );
    const cookieA = vendorA.cookie;
    const vendorAId = vendorA.vendorId;
    assert(!!cookieA && !!vendorAId, 'Vendor A registered and authenticated with ID: ' + vendorAId);

    // Create a service for Vendor A
    const srvRes = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: 'Destination Candid Photography & 4K Cinema',
        category_id: validCategory.id,
        starting_price: 45000,
        location: 'Jodhpur, Rajasthan',
        description: 'Elite royal destination wedding coverage.'
      })
    });
    const srvJson = await srvRes.json();
    assert(srvRes.ok && srvJson.success, 'Created wedding service for Vendor A');
    const serviceId = srvJson.data.id;

    // Verify Vendor A in database so public endpoints can serve profile
    const mysql = require('mysql2/promise');
    const dbConn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'wedwithme',
      port: parseInt(process.env.DB_PORT || '3306', 10),
    });
    await dbConn.query("UPDATE vendors SET verification_status = 'VERIFIED' WHERE id = ?", [vendorAId]);
    await dbConn.end();

    // 3. Photo Upload (Real Multipart/form-data & Storage)
    console.log('\n3. Testing Photo Upload (Multipart/form-data with storage)...');
    const photoBuffer = Buffer.from('FAKE_JPEG_IMAGE_CONTENT_SAMPLE_' + timestamp);
    const photoBlob = new Blob([photoBuffer], { type: 'image/jpeg' });
    const photoFormData = new FormData();
    photoFormData.append('file', photoBlob, 'royal_mandap_decor.jpg');
    photoFormData.append('media_type', 'IMAGE');
    photoFormData.append('title', 'Royal Mandap Floral Setup');
    photoFormData.append('caption', 'Handcrafted orchid mandap under palace starlight.');
    photoFormData.append('service_id', serviceId);
    photoFormData.append('is_cover', 'true');

    const uploadPhotoRes = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: photoFormData,
    });
    const uploadPhotoJson = await uploadPhotoRes.json();
    assert(uploadPhotoRes.status === 201 && uploadPhotoJson.success, 'Uploaded Photo 1 via multipart/form-data (201 Created)');
    assert(uploadPhotoJson.data?.media_type === 'IMAGE', 'Media type correctly saved as IMAGE');
    assert(uploadPhotoJson.data?.is_cover === true, 'Saved as cover photo (is_cover = true)');
    assert(uploadPhotoJson.data?.moderation_status === 'PENDING_REVIEW', 'Default moderation status is PENDING_REVIEW');
    const photo1Id = uploadPhotoJson.data.id;
    const photo1Url = uploadPhotoJson.data.media_url || uploadPhotoJson.data.image_url;
    assert(photo1Url && photo1Url.startsWith('/uploads/portfolio/photos/'), 'Stored with clean public URL path: ' + photo1Url);

    // Verify file exists on disk
    const diskPath1 = path.join(process.cwd(), 'public', photo1Url.replace(/^\//, ''));
    assert(fs.existsSync(diskPath1), 'Physical image file exists on disk in storage folder');

    // 4. Video Upload (Real Multipart/form-data & Storage)
    console.log('\n4. Testing Video Upload (Multipart/form-data with storage)...');
    const videoBuffer = Buffer.from('FAKE_MP4_VIDEO_STREAM_DATA_' + timestamp);
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
    const videoFormData = new FormData();
    videoFormData.append('file', videoBlob, 'cinematic_drone_teaser.mp4');
    videoFormData.append('media_type', 'VIDEO');
    videoFormData.append('title', '4K Drone Baraat Procession');
    videoFormData.append('caption', 'Cinematic aerial tracking of royal elephant procession.');
    videoFormData.append('service_id', serviceId);

    const uploadVideoRes = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: videoFormData,
    });
    const uploadVideoJson = await uploadVideoRes.json();
    assert(uploadVideoRes.status === 201 && uploadVideoJson.success, 'Uploaded Video 1 via multipart/form-data (201 Created)');
    assert(uploadVideoJson.data?.media_type === 'VIDEO', 'Media type correctly saved as VIDEO');
    assert(uploadVideoJson.data?.moderation_status === 'PENDING_REVIEW', 'Video default moderation status is PENDING_REVIEW');
    const video1Id = uploadVideoJson.data.id;
    const video1Url = uploadVideoJson.data.media_url || uploadVideoJson.data.image_url;
    assert(video1Url && video1Url.startsWith('/uploads/portfolio/videos/'), 'Video stored in dedicated videos folder: ' + video1Url);

    const diskVideoPath = path.join(process.cwd(), 'public', video1Url.replace(/^\//, ''));
    assert(fs.existsSync(diskVideoPath), 'Physical video file exists on disk in storage folder');

    // 5. Backend Validations & Rejections
    console.log('\n5. Testing Backend Validations & Error Handling...');

    // 5a. Missing file
    const emptyFormData = new FormData();
    const emptyRes = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: emptyFormData,
    });
    assert(emptyRes.status === 400, 'Rejected request with missing media file (400 Bad Request)');

    // 5b. Unsupported file type (.exe)
    const badFileBlob = new Blob([Buffer.from('MZ executable')], { type: 'application/x-msdownload' });
    const badFileFormData = new FormData();
    badFileFormData.append('file', badFileBlob, 'malware.exe');
    badFileFormData.append('media_type', 'IMAGE');
    const badFileRes = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: badFileFormData,
    });
    assert(badFileRes.status === 400, 'Rejected unsupported executable file format (400 Bad Request)');

    // 5c. Oversized image (>15MB limit)
    const oversizedBlob = new Blob([Buffer.alloc(16 * 1024 * 1024)], { type: 'image/jpeg' });
    const oversizedFormData = new FormData();
    oversizedFormData.append('file', oversizedBlob, 'huge_photo.jpg');
    oversizedFormData.append('media_type', 'IMAGE');
    const oversizedRes = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: oversizedFormData,
    });
    assert(oversizedRes.status === 400, 'Rejected oversized image exceeding 15MB limit (400 Bad Request)');

    // 6. Test GET /api/vendor/portfolio and Storage Quota Stats
    console.log('\n6. Testing GET /api/vendor/portfolio & Storage Stats...');
    const listRes = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      headers: { Cookie: cookieA },
    });
    const listJson = await listRes.json();
    assert(listRes.ok && listJson.success, 'GET /api/vendor/portfolio returned 200 OK');
    assert(listJson.data.length >= 2, 'Fetched vendor portfolio media items (at least 2 items)');
    assert(!!listJson.storage_stats, 'Returned storage_stats object');
    assert(listJson.storage_stats.total_photos >= 1, 'Storage stats counts photos correctly');
    assert(listJson.storage_stats.total_videos >= 1, 'Storage stats counts videos correctly');
    assert(listJson.storage_stats.pending_count >= 2, 'Storage stats counts pending moderation items');
    assert(listJson.storage_stats.max_quota_bytes === 250 * 1024 * 1024, 'Max quota correctly reported as 250MB');

    // 7. Test Portfolio Update & Cover Photo Switching
    console.log('\n7. Testing Portfolio Update and Cover Photo Switching...');
    // Upload Photo 2
    const photo2Buffer = Buffer.from('FAKE_PHOTO_2_DATA_' + timestamp);
    const photo2Blob = new Blob([photo2Buffer], { type: 'image/png' });
    const photo2FormData = new FormData();
    photo2FormData.append('file', photo2Blob, 'sangeet_celebration.png');
    photo2FormData.append('media_type', 'IMAGE');
    photo2FormData.append('title', 'Sangeet Stage Lighting');
    const uploadPhoto2Res = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: photo2FormData,
    });
    const uploadPhoto2Json = await uploadPhoto2Res.json();
    const photo2Id = uploadPhoto2Json.data.id;
    assert(!!photo2Id, 'Uploaded Photo 2 successfully');

    // Set Photo 2 as cover photo and update caption
    const setCoverRes = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        id: photo2Id,
        title: 'Grand Sangeet Stage & Fireworks',
        caption: 'Updated fairy light canopy styling.',
        is_cover: true,
      }),
    });
    const setCoverJson = await setCoverRes.json();
    assert(setCoverRes.ok && setCoverJson.success && setCoverJson.data?.is_cover === true, 'Updated Photo 2 as primary cover photo');

    // Verify Photo 1 is no longer cover
    const checkCoverListRes = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      headers: { Cookie: cookieA },
    });
    const checkCoverListJson = await checkCoverListRes.json();
    const p1 = checkCoverListJson.data.find(p => p.id === photo1Id);
    const p2 = checkCoverListJson.data.find(p => p.id === photo2Id);
    assert(p2?.is_cover === true, 'Photo 2 confirmed as new cover photo');
    assert(p1?.is_cover === false, 'Photo 1 is_cover automatically unset to false');

    // 8. Test Moderation Workflow & Public Discovery Gating
    console.log('\n8. Testing Moderation Workflow and Public Visibility Gating...');
    
    // 8a. Public profile endpoint should NOT return pending items
    const publicProfileBefore = await fetch(`${BASE_URL}/api/vendors/${vendorAId}`);
    const publicBeforeJson = await publicProfileBefore.json();
    const publicPortfoliosBefore = publicBeforeJson.data?.portfolios || [];
    assert(publicPortfoliosBefore.length === 0, 'Public profile API returns 0 portfolio items when items are PENDING_REVIEW');

    // 8b. Admin approves Photo 1
    console.log('   Admin approving Photo 1 via /api/admin/portfolio/[id]...');
    const adminCookie = await loginAdmin();
    const approvePhotoRes = await fetch(`${BASE_URL}/api/admin/portfolio/${photo1Id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ moderation_status: 'APPROVED' }),
    });
    const approvePhotoJson = await approvePhotoRes.json();
    assert(approvePhotoRes.ok && approvePhotoJson.success && approvePhotoJson.data?.moderation_status === 'APPROVED', 'Admin approved Photo 1');

    // 8c. Admin rejects Photo 2 with feedback reason
    console.log('   Admin rejecting Photo 2 with feedback...');
    const rejectPhotoRes = await fetch(`${BASE_URL}/api/admin/portfolio/${photo2Id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        moderation_status: 'REJECTED',
        rejection_reason: 'Image does not meet quality resolution criteria',
      }),
    });
    const rejectPhotoJson = await rejectPhotoRes.json();
    assert(rejectPhotoRes.ok && rejectPhotoJson.data?.moderation_status === 'REJECTED', 'Admin rejected Photo 2 with rejection reason');

    // 8d. Public profile endpoint should now return ONLY approved Photo 1
    const publicProfileAfter = await fetch(`${BASE_URL}/api/vendors/${vendorAId}`);
    const publicAfterJson = await publicProfileAfter.json();
    const publicPortfoliosAfter = publicAfterJson.data?.portfolios || [];
    assert(publicPortfoliosAfter.length === 1, 'Public profile returns exactly 1 approved portfolio item');
    assert(publicPortfoliosAfter[0].id === photo1Id, 'Returned portfolio item is approved Photo 1');
    assert(!publicPortfoliosAfter.map(p => p.id).includes(photo2Id), 'Rejected Photo 2 is excluded from public profile');
    assert(!publicPortfoliosAfter.map(p => p.id).includes(video1Id), 'Pending Video 1 is excluded from public profile');

    // 9. Test Tenant Isolation and Cross-Vendor Protection
    console.log('\n9. Testing Tenant Isolation (Vendor B cannot modify Vendor A media)...');
    const vendorB = await registerVendor(
      'Divya Kapoor ' + timestamp,
      vendorBEmail,
      'Kapoor Luxury Snaps ' + timestamp,
      validCategory.id
    );
    const cookieB = vendorB.cookie;

    // 9a. Vendor B attempts to update Vendor A's portfolio item
    const vBUpdateRes = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({
        id: photo1Id,
        title: 'Hacked Title by Vendor B',
      }),
    });
    assert(vBUpdateRes.status === 403 || vBUpdateRes.status === 404, 'Vendor B prevented from updating Vendor A portfolio item (403/404)');

    // 9b. Vendor B attempts to delete Vendor A's portfolio item
    const vBDeleteRes = await fetch(`${BASE_URL}/api/vendor/portfolio?id=${photo1Id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieB },
    });
    assert(vBDeleteRes.status === 403 || vBDeleteRes.status === 404, 'Vendor B prevented from deleting Vendor A portfolio item (403/404)');

    // 10. Test Media Deletion and Storage File Cleanup
    console.log('\n10. Testing Media Deletion and Storage Cleanup by Owner...');
    
    // Vendor A deletes Photo 2
    const photo2Url = uploadPhoto2Json.data.media_url || uploadPhoto2Json.data.image_url;
    const diskPath2 = path.join(process.cwd(), 'public', photo2Url.replace(/^\//, ''));
    assert(fs.existsSync(diskPath2), 'Photo 2 file exists on disk before deletion');

    const delPhoto2Res = await fetch(`${BASE_URL}/api/vendor/portfolio?id=${photo2Id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(delPhoto2Res.ok, 'Vendor A deleted Photo 2 via DELETE /api/vendor/portfolio?id=...');
    assert(!fs.existsSync(diskPath2), 'Physical file for Photo 2 deleted from disk storage');

    // Vendor A deletes Video 1
    const delVideoRes = await fetch(`${BASE_URL}/api/vendor/portfolio?id=${video1Id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(delVideoRes.ok, 'Vendor A deleted Video 1 via DELETE /api/vendor/portfolio?id=...');
    assert(!fs.existsSync(diskVideoPath), 'Physical video file deleted from disk storage');

    // Verify Photo 2 and Video 1 are gone from list
    const finalListRes = await fetch(`${BASE_URL}/api/vendor/portfolio`, {
      headers: { Cookie: cookieA },
    });
    const finalListJson = await finalListRes.json();
    const finalIds = finalListJson.data.map(p => p.id);
    assert(!finalIds.includes(photo2Id), 'Photo 2 removed from database');
    assert(!finalIds.includes(video1Id), 'Video 1 removed from database');
    assert(finalIds.includes(photo1Id), 'Photo 1 retained');

    // Clean up Photo 1
    await fetch(`${BASE_URL}/api/vendor/portfolio?id=${photo1Id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(!fs.existsSync(diskPath1), 'Photo 1 physical file cleaned up from disk');

    // 11. Final Summary
    console.log('\n======================================================');
    console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('\nUnexpected test error:', err);
    process.exit(1);
  }
}

runTests();
