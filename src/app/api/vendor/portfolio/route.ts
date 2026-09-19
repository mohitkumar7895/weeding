import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import {
  storageService,
  MAX_VENDOR_PORTFOLIO_QUOTA,
  ALLOWED_PORTFOLIO_VIDEO_MIMES,
  ALLOWED_PORTFOLIO_IMAGE_MIMES,
} from '@/services/storageService';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type'); // 'IMAGE' | 'VIDEO' | 'all'
    const statusParam = searchParams.get('status'); // 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'all'
    const serviceIdParam = searchParams.get('service_id');
    const vendorIdParam = searchParams.get('vendor_id');

    let targetVendorId = '';
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';

    if (user.role === 'VENDOR') {
      const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
      if (!vendors.length) {
        return NextResponse.json({ success: false, message: 'Vendor record not found' }, { status: 404 });
      }
      targetVendorId = vendors[0].id;
    } else if (isAdmin && vendorIdParam) {
      targetVendorId = vendorIdParam;
    } else {
      return NextResponse.json({ success: false, message: 'Vendor access required' }, { status: 403 });
    }

    // Build SQL query
    let sql = `
      SELECT 
        vp.id,
        vp.vendor_id,
        vp.service_id,
        vp.media_type,
        vp.image_url,
        COALESCE(vp.media_url, vp.image_url) AS media_url,
        vp.thumbnail_url,
        vp.title,
        vp.caption,
        vp.description,
        vp.file_size,
        vp.mime_type,
        vp.storage_provider,
        vp.moderation_status,
        vp.rejection_reason,
        vp.is_cover,
        vp.is_active,
        vp.display_order,
        vp.created_at,
        vp.updated_at,
        vs.title AS service_title
      FROM vendor_portfolios vp
      LEFT JOIN vendor_services vs ON vp.service_id = vs.id
      WHERE vp.vendor_id = ?
    `;
    const params: any[] = [targetVendorId];

    if (typeParam && typeParam !== 'all') {
      sql += ` AND vp.media_type = ?`;
      params.push(typeParam.toUpperCase());
    }

    if (statusParam && statusParam !== 'all') {
      sql += ` AND vp.moderation_status = ?`;
      params.push(statusParam.toUpperCase());
    }

    if (serviceIdParam) {
      sql += ` AND vp.service_id = ?`;
      params.push(serviceIdParam);
    }

    sql += ` ORDER BY vp.is_cover DESC, vp.display_order ASC, vp.created_at DESC`;

    const items = await query<any[]>(sql, params);

    // Format boolean & numerical fields
    const formattedItems = items.map((item) => ({
      ...item,
      is_cover: Boolean(item.is_cover),
      is_active: Boolean(item.is_active),
      file_size: parseInt(item.file_size, 10) || 0,
      display_order: parseInt(item.display_order, 10) || 0,
    }));

    // Calculate vendor storage quota statistics
    const statsRows = await query<any[]>(
      `SELECT 
        COUNT(*) AS total_items,
        SUM(CASE WHEN media_type = 'IMAGE' THEN 1 ELSE 0 END) AS total_photos,
        SUM(CASE WHEN media_type = 'VIDEO' THEN 1 ELSE 0 END) AS total_videos,
        SUM(CASE WHEN moderation_status = 'PENDING_REVIEW' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN moderation_status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_count,
        COALESCE(SUM(file_size), 0) AS total_bytes_used
       FROM vendor_portfolios 
       WHERE vendor_id = ?`,
      [targetVendorId]
    );

    const stats = statsRows[0] || {
      total_items: 0,
      total_photos: 0,
      total_videos: 0,
      pending_count: 0,
      approved_count: 0,
      total_bytes_used: 0,
    };

    const totalBytesUsed = parseInt(stats.total_bytes_used, 10) || 0;
    const storageStats = {
      total_items: parseInt(stats.total_items, 10) || 0,
      total_photos: parseInt(stats.total_photos, 10) || 0,
      total_videos: parseInt(stats.total_videos, 10) || 0,
      pending_count: parseInt(stats.pending_count, 10) || 0,
      approved_count: parseInt(stats.approved_count, 10) || 0,
      total_bytes_used: totalBytesUsed,
      max_quota_bytes: MAX_VENDOR_PORTFOLIO_QUOTA,
      used_mb: parseFloat((totalBytesUsed / (1024 * 1024)).toFixed(2)),
      max_quota_mb: parseFloat((MAX_VENDOR_PORTFOLIO_QUOTA / (1024 * 1024)).toFixed(0)),
      quota_percentage: Math.min(100, parseFloat(((totalBytesUsed / MAX_VENDOR_PORTFOLIO_QUOTA) * 100).toFixed(1))),
    };

    return NextResponse.json({
      success: true,
      data: formattedItems,
      storage_stats: storageStats,
    });
  } catch (error: any) {
    console.error('API /api/vendor/portfolio GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor record not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    // Check current storage usage against quota
    const usageRows = await query<any[]>(
      `SELECT COALESCE(SUM(file_size), 0) AS current_usage FROM vendor_portfolios WHERE vendor_id = ?`,
      [vendorId]
    );
    const currentUsageBytes = parseInt(usageRows[0]?.current_usage || 0, 10);

    const contentType = req.headers.get('content-type') || '';
    let mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE';
    let mediaUrl = '';
    let thumbnailUrl: string | null = null;
    let title: string | null = null;
    let caption: string | null = null;
    let description: string | null = null;
    let serviceId: string | null = null;
    let isCover = false;
    let fileSize = 0;
    let mimeType = 'image/jpeg';
    let storageProvider = 'LOCAL';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, message: 'Media file is required' }, { status: 400 });
      }

      fileSize = file.size;
      mimeType = (file.type || '').toLowerCase();

      // Determine or validate media type
      const reqMediaType = formData.get('media_type') as string | null;
      if (reqMediaType && (reqMediaType.toUpperCase() === 'VIDEO' || reqMediaType.toUpperCase() === 'IMAGE')) {
        mediaType = reqMediaType.toUpperCase() as 'IMAGE' | 'VIDEO';
      } else {
        mediaType = ALLOWED_PORTFOLIO_VIDEO_MIMES.includes(mimeType) ? 'VIDEO' : 'IMAGE';
      }

      // Backend media validation
      const validation = storageService.validatePortfolioMedia(fileSize, mimeType, mediaType);
      if (!validation.valid) {
        return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
      }

      // Quota check
      if (currentUsageBytes + fileSize > MAX_VENDOR_PORTFOLIO_QUOTA) {
        const remainingMb = ((MAX_VENDOR_PORTFOLIO_QUOTA - currentUsageBytes) / (1024 * 1024)).toFixed(1);
        return NextResponse.json({
          success: false,
          message: `Storage quota exceeded. Your vendor account has ${remainingMb} MB remaining out of 250 MB quota.`,
        }, { status: 400 });
      }

      // Process and save main media file
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const targetFolder = mediaType === 'VIDEO' ? 'portfolio/videos' : 'portfolio/photos';
      const stored = await storageService.saveFile(buffer, file.name, mimeType, targetFolder);
      mediaUrl = stored.url;
      fileSize = stored.sizeBytes;
      storageProvider = stored.storageProvider;

      // Check for optional thumbnail file (especially useful for videos)
      const thumbFile = formData.get('thumbnail') as File | null || formData.get('thumbnail_file') as File | null;
      if (thumbFile && thumbFile.size > 0) {
        const thumbValidation = storageService.validatePortfolioMedia(thumbFile.size, thumbFile.type, 'IMAGE');
        if (thumbValidation.valid) {
          const thumbBuffer = Buffer.from(await thumbFile.arrayBuffer());
          const storedThumb = await storageService.saveFile(thumbBuffer, thumbFile.name, thumbFile.type, 'portfolio/thumbnails');
          thumbnailUrl = storedThumb.url;
        }
      }

      title = (formData.get('title') as string) || null;
      caption = (formData.get('caption') as string) || null;
      description = (formData.get('description') as string) || null;
      serviceId = (formData.get('service_id') as string) || null;
      isCover = formData.get('is_cover') === 'true' || formData.get('is_cover') === '1';
    } else {
      // JSON payload support
      const body = await req.json();
      mediaUrl = body.media_url || body.image_url;
      if (!mediaUrl) {
        return NextResponse.json({ success: false, message: 'media_url is required' }, { status: 400 });
      }

      mimeType = (body.mime_type || (mediaUrl.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg')).toLowerCase();
      mediaType = body.media_type
        ? body.media_type.toUpperCase()
        : (ALLOWED_PORTFOLIO_VIDEO_MIMES.includes(mimeType) ? 'VIDEO' : 'IMAGE');

      fileSize = parseInt(body.file_size, 10) || (mediaType === 'VIDEO' ? 5242880 : 1048576);

      const validation = storageService.validatePortfolioMedia(fileSize, mimeType, mediaType);
      if (!validation.valid) {
        return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
      }

      if (currentUsageBytes + fileSize > MAX_VENDOR_PORTFOLIO_QUOTA) {
        return NextResponse.json({
          success: false,
          message: 'Storage quota exceeded. Max allowed vendor portfolio quota is 250 MB.',
        }, { status: 400 });
      }

      title = body.title || null;
      caption = body.caption || null;
      description = body.description || null;
      serviceId = body.service_id || null;
      thumbnailUrl = body.thumbnail_url || null;
      isCover = Boolean(body.is_cover);
      storageProvider = body.storage_provider || 'LOCAL';
    }

    // If service_id provided, verify ownership
    if (serviceId) {
      const srvCheck = await query<any[]>(
        `SELECT id FROM vendor_services WHERE id = ? AND vendor_id = ?`,
        [serviceId, vendorId]
      );
      if (!srvCheck.length) {
        serviceId = null; // Unlink if invalid
      }
    }

    // If marked as cover, only images can be cover photos; unset previous covers
    if (isCover && mediaType === 'IMAGE') {
      await query(`UPDATE vendor_portfolios SET is_cover = FALSE WHERE vendor_id = ?`, [vendorId]);
    } else if (mediaType === 'VIDEO') {
      isCover = false;
    }

    const id = `pf_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const initialModeration = 'PENDING_REVIEW';

    await query(
      `INSERT INTO vendor_portfolios (
        id, vendor_id, service_id, media_type, image_url, media_url, thumbnail_url,
        title, caption, description, file_size, mime_type, storage_provider,
        moderation_status, is_active, is_cover, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        vendorId,
        serviceId,
        mediaType,
        mediaUrl, // sync image_url with mediaUrl for backward compatibility
        mediaUrl,
        thumbnailUrl,
        title ? title.trim() : null,
        caption ? caption.trim() : null,
        description ? description.trim() : null,
        fileSize,
        mimeType,
        storageProvider,
        initialModeration,
        1, // is_active
        isCover ? 1 : 0,
        0, // display_order
      ]
    );

    await logAudit(user.id, 'UPLOAD_PORTFOLIO_MEDIA', 'vendor_portfolios', id, {
      media_type: mediaType,
      file_size: fileSize,
      mime_type: mimeType,
      moderation_status: initialModeration,
    });

    const createdRows = await query<any[]>(
      `SELECT * FROM vendor_portfolios WHERE id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Portfolio media uploaded successfully and submitted for moderation review',
      data: {
        ...createdRows[0],
        is_cover: Boolean(createdRows[0]?.is_cover),
        is_active: Boolean(createdRows[0]?.is_active),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('API /api/vendor/portfolio POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor record not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    const body = await req.json();
    const { id, title, caption, description, is_cover, is_active, display_order, service_id } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Portfolio item ID is required' }, { status: 400 });
    }

    const existing = await query<any[]>(
      `SELECT * FROM vendor_portfolios WHERE id = ? AND vendor_id = ?`,
      [id, vendorId]
    );

    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Portfolio item not found or unauthorized' }, { status: 404 });
    }

    const current = existing[0];

    // If setting as cover, ensure it is an image and unset other covers
    if (is_cover === true && current.media_type === 'IMAGE') {
      await query(`UPDATE vendor_portfolios SET is_cover = FALSE WHERE vendor_id = ?`, [vendorId]);
    }

    let targetServiceId = current.service_id;
    if (service_id !== undefined) {
      if (service_id) {
        const srvCheck = await query<any[]>(
          `SELECT id FROM vendor_services WHERE id = ? AND vendor_id = ?`,
          [service_id, vendorId]
        );
        targetServiceId = srvCheck.length ? service_id : null;
      } else {
        targetServiceId = null;
      }
    }

    await query(
      `UPDATE vendor_portfolios SET
        title = COALESCE(?, title),
        caption = COALESCE(?, caption),
        description = COALESCE(?, description),
        service_id = ?,
        is_cover = COALESCE(?, is_cover),
        is_active = COALESCE(?, is_active),
        display_order = COALESCE(?, display_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND vendor_id = ?`,
      [
        title !== undefined ? (title ? title.trim() : null) : null,
        caption !== undefined ? (caption ? caption.trim() : null) : null,
        description !== undefined ? (description ? description.trim() : null) : null,
        targetServiceId,
        is_cover !== undefined ? (is_cover ? 1 : 0) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        display_order !== undefined ? parseInt(display_order, 10) : null,
        id,
        vendorId,
      ]
    );

    await logAudit(user.id, 'UPDATE_PORTFOLIO_ITEM', 'vendor_portfolios', id);

    const updated = await query<any[]>(`SELECT * FROM vendor_portfolios WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Portfolio item updated successfully',
      data: {
        ...updated[0],
        is_cover: Boolean(updated[0]?.is_cover),
        is_active: Boolean(updated[0]?.is_active),
      },
    });
  } catch (error: any) {
    console.error('API /api/vendor/portfolio PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor record not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    // Support both URL searchParam id and JSON body id
    let id = req.nextUrl.searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, message: 'Portfolio media ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await query<any[]>(
      `SELECT id, image_url, media_url, thumbnail_url, storage_provider FROM vendor_portfolios WHERE id = ? AND vendor_id = ?`,
      [id, vendorId]
    );

    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Portfolio media not found or unauthorized' }, { status: 404 });
    }

    const item = existing[0];

    // Delete stored media files from disk/storage
    const mainUrl = item.media_url || item.image_url;
    if (mainUrl) {
      await storageService.deleteFile(mainUrl);
    }
    if (item.thumbnail_url) {
      await storageService.deleteFile(item.thumbnail_url);
    }

    // Delete database record
    await query(`DELETE FROM vendor_portfolios WHERE id = ? AND vendor_id = ?`, [id, vendorId]);

    await logAudit(user.id, 'DELETE_PORTFOLIO_MEDIA', 'vendor_portfolios', id);

    return NextResponse.json({
      success: true,
      message: 'Portfolio media removed successfully',
      data: { id },
    });
  } catch (error: any) {
    console.error('API /api/vendor/portfolio DELETE Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
