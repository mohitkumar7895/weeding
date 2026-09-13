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

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

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

  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = 'vendor-documents'
  ): Promise<FileMetadata> {
    const validation = this.validateFile(buffer.length, mimeType);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file');
    }

    // Determine safe extension from original name or MIME type
    const rawExt = path.extname(originalName).toLowerCase();
    let safeExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : '.pdf';
    if (mimeType === 'image/jpeg' && safeExt !== '.jpg' && safeExt !== '.jpeg') {
      safeExt = '.jpg';
    } else if (mimeType === 'image/png' && safeExt !== '.png') {
      safeExt = '.png';
    } else if (mimeType === 'image/webp' && safeExt !== '.webp') {
      safeExt = '.webp';
    } else if (mimeType === 'application/pdf' && safeExt !== '.pdf') {
      safeExt = '.pdf';
    }

    // Sanitize target directory
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const targetDir = path.join(this.uploadsBaseDir, safeFolder);

    // Ensure directory exists
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Generate safe UUID filename
    const uniqueFilename = `doc_${Date.now()}_${randomUUID().substring(0, 8)}${safeExt}`;
    const targetFilePath = path.join(targetDir, uniqueFilename);

    // Write file securely to disk
    await fs.promises.writeFile(targetFilePath, buffer);

    const relativeWebUrl = `/uploads/${safeFolder}/${uniqueFilename}`;

    return {
      filename: uniqueFilename,
      originalName: originalName.replace(/[^a-zA-Z0-9._-]/g, '_'),
      mimeType,
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
