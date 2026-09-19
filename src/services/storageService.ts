import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface FileMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  storageProvider: 'LOCAL' | 'S3';
  storedAt: string;
}

export interface IStorageProvider {
  saveFile(buffer: Buffer, originalName: string, mimeType: string, folder?: string): Promise<FileMetadata>;
  deleteFile(urlOrKey: string): Promise<boolean>;
  validateFile(sizeBytes: number, mimeType: string): { valid: boolean; error?: string };
}

// 10MB limit enforced
export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Whitelisted MIME types for secure KYC documents and verification
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ALLOWED_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.webp',
  '.mp4', '.webm', '.mov', '.gif', '.heic'
];

// Portfolio media constants
export const MAX_PORTFOLIO_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
export const MAX_PORTFOLIO_VIDEO_SIZE = 60 * 1024 * 1024; // 60MB
export const MAX_VENDOR_PORTFOLIO_QUOTA = 250 * 1024 * 1024; // 250MB per vendor

export const ALLOWED_PORTFOLIO_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

export const ALLOWED_PORTFOLIO_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export interface IStorageProvider {
  saveFile(buffer: Buffer, originalName: string, mimeType: string, folder?: string): Promise<FileMetadata>;
  deleteFile(urlOrKey: string): Promise<boolean>;
  validateFile(sizeBytes: number, mimeType: string): { valid: boolean; error?: string };
  validatePortfolioMedia(sizeBytes: number, mimeType: string, mediaType: 'IMAGE' | 'VIDEO'): { valid: boolean; error?: string };
}

class LocalStorageProvider implements IStorageProvider {
  private uploadsBaseDir: string;

  constructor() {
    this.uploadsBaseDir = path.join(process.cwd(), 'public', 'uploads');
  }

  validateFile(sizeBytes: number, mimeType: string): { valid: boolean; error?: string } {
    if (!sizeBytes || sizeBytes <= 0) {
      return { valid: false, error: 'Empty file uploaded' };
    }

    if (sizeBytes > MAX_DOCUMENT_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds the maximum allowed limit of 10MB (Received: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB)`,
      };
    }

    const normalizedMime = mimeType.toLowerCase();
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(normalizedMime)) {
      return {
        valid: false,
        error: `Unsupported file type "${mimeType}". Allowed formats: PDF, JPEG, PNG, WebP.`,
      };
    }

    return { valid: true };
  }

  validatePortfolioMedia(sizeBytes: number, mimeType: string, mediaType: 'IMAGE' | 'VIDEO'): { valid: boolean; error?: string } {
    if (!sizeBytes || sizeBytes <= 0) {
      return { valid: false, error: 'Empty media file uploaded' };
    }

    const normalizedMime = (mimeType || '').toLowerCase();

    if (mediaType === 'IMAGE') {
      if (sizeBytes > MAX_PORTFOLIO_IMAGE_SIZE) {
        return {
          valid: false,
          error: `Image file size exceeds the maximum limit of 15MB (Received: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB)`,
        };
      }
      if (!ALLOWED_PORTFOLIO_IMAGE_MIMES.includes(normalizedMime)) {
        return {
          valid: false,
          error: `Unsupported image format "${mimeType}". Allowed formats: JPEG, PNG, WebP, GIF, HEIC.`,
        };
      }
    } else if (mediaType === 'VIDEO') {
      if (sizeBytes > MAX_PORTFOLIO_VIDEO_SIZE) {
        return {
          valid: false,
          error: `Video file size exceeds the maximum limit of 60MB (Received: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB)`,
        };
      }
      if (!ALLOWED_PORTFOLIO_VIDEO_MIMES.includes(normalizedMime)) {
        return {
          valid: false,
          error: `Unsupported video format "${mimeType}". Allowed formats: MP4, WebM, QuickTime (MOV).`,
        };
      }
    } else {
      return { valid: false, error: `Invalid media type: ${mediaType}. Allowed types: IMAGE, VIDEO.` };
    }

    return { valid: true };
  }

  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = 'vendor-documents'
  ): Promise<FileMetadata> {
    const normalizedMime = (mimeType || '').toLowerCase();
    const isPortfolio = folder.includes('portfolio');
    const isVideo = ALLOWED_PORTFOLIO_VIDEO_MIMES.includes(normalizedMime);
    const isPortfolioImage = ALLOWED_PORTFOLIO_IMAGE_MIMES.includes(normalizedMime);

    if (isPortfolio || isVideo || isPortfolioImage) {
      const mediaType: 'IMAGE' | 'VIDEO' = isVideo ? 'VIDEO' : 'IMAGE';
      const validation = this.validatePortfolioMedia(buffer.length, normalizedMime, mediaType);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid portfolio media file');
      }
    } else {
      const validation = this.validateFile(buffer.length, normalizedMime);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid file');
      }
    }

    // Determine safe extension from original name or MIME type
    const rawExt = path.extname(originalName).toLowerCase();
    let safeExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : '.jpg';
    if (normalizedMime === 'image/jpeg') safeExt = '.jpg';
    else if (normalizedMime === 'image/png') safeExt = '.png';
    else if (normalizedMime === 'image/webp') safeExt = '.webp';
    else if (normalizedMime === 'image/gif') safeExt = '.gif';
    else if (normalizedMime === 'image/heic' || normalizedMime === 'image/heif') safeExt = '.heic';
    else if (normalizedMime === 'video/mp4') safeExt = '.mp4';
    else if (normalizedMime === 'video/webm') safeExt = '.webm';
    else if (normalizedMime === 'video/quicktime') safeExt = '.mov';
    else if (normalizedMime === 'application/pdf') safeExt = '.pdf';

    // Sanitize target directory, allowing nested paths like 'portfolio/photos'
    const safeFolder = folder.replace(/[^a-zA-Z0-9_\-\/]/g, '').replace(/\.\./g, '');
    const targetDir = path.join(this.uploadsBaseDir, safeFolder);

    // Ensure directory exists
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Generate safe UUID filename with appropriate prefix
    const prefix = isVideo ? 'vid' : (isPortfolio ? 'img' : 'doc');
    const uniqueFilename = `${prefix}_${Date.now()}_${randomUUID().substring(0, 8)}${safeExt}`;
    const targetFilePath = path.join(targetDir, uniqueFilename);

    // Write file securely to disk
    await fs.promises.writeFile(targetFilePath, buffer);

    const relativeWebUrl = `/uploads/${safeFolder}/${uniqueFilename}`;

    return {
      filename: uniqueFilename,
      originalName: originalName.replace(/[^a-zA-Z0-9._-]/g, '_'),
      mimeType: normalizedMime,
      sizeBytes: buffer.length,
      url: relativeWebUrl,
      storageProvider: 'LOCAL',
      storedAt: new Date().toISOString(),
    };
  }

  async deleteFile(urlOrKey: string): Promise<boolean> {
    try {
      if (!urlOrKey) return false;
      const cleanPath = urlOrKey.startsWith('/') ? urlOrKey.substring(1) : urlOrKey;
      const fullPath = path.join(process.cwd(), 'public', cleanPath);

      // Verify the path is within public/uploads to prevent directory traversal
      if (!fullPath.startsWith(this.uploadsBaseDir)) {
        console.warn(`[storageService] Blocked unsafe file deletion path: ${urlOrKey}`);
        return false;
      }

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[storageService] Failed to delete file:', err);
      return false;
    }
  }
}

// Storage service abstraction singleton (can be replaced or wrapped for S3 in production)
export const storageService: IStorageProvider = new LocalStorageProvider();
