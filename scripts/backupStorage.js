const fs = require('fs');
const path = require('path');

/**
 * Storage Abstraction for Database Backups.
 * Currently uses local filesystem but is designed to be easily swapped 
 * out for S3, GCS, or Azure Blob Storage via environment variables.
 */
class BackupStorageProvider {
  constructor() {
    this.providerType = process.env.BACKUP_STORAGE_PROVIDER || 'local';
    
    // Setup Local Storage
    if (this.providerType === 'local') {
      this.localPath = process.env.BACKUP_LOCAL_PATH || path.join(__dirname, '..', 'backups');
      if (!fs.existsSync(this.localPath)) {
        fs.mkdirSync(this.localPath, { recursive: true });
      }
    }
  }

  /**
   * Save the backup buffer to the configured storage provider
   */
  async saveBackup(filename, dataString) {
    if (this.providerType === 'local') {
      const filePath = path.join(this.localPath, filename);
      fs.writeFileSync(filePath, dataString, 'utf-8');
      console.log(`[Storage] Saved backup locally to ${filePath}`);
      return filePath;
    } else if (this.providerType === 's3') {
      // Stub for future S3 integration
      // const s3 = new AWS.S3({ region: process.env.AWS_REGION });
      // await s3.putObject({ Bucket: process.env.BACKUP_S3_BUCKET, Key: filename, Body: dataString }).promise();
      throw new Error("S3 provider not fully implemented yet");
    }
    throw new Error(`Unsupported backup provider: ${this.providerType}`);
  }

  /**
   * List all backups and purge those exceeding retention
   */
  async enforceRetention(retentionDays) {
    if (this.providerType === 'local') {
      const now = Date.now();
      const files = fs.readdirSync(this.localPath);
      let purgedCount = 0;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(this.localPath, file);
        const stats = fs.statSync(filePath);
        const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        
        if (ageDays > retentionDays) {
          fs.unlinkSync(filePath);
          console.log(`[Storage] Purged stale backup: ${file} (Age: ${ageDays.toFixed(1)} days)`);
          purgedCount++;
        }
      }
      return purgedCount;
    }
    // Implement retention for S3/GCS here
  }

  /**
   * Get the most recent backup file (for auto-restore)
   */
  async getLatestBackup() {
    if (this.providerType === 'local') {
      const files = fs.readdirSync(this.localPath).filter((f) => f.endsWith('.json'));
      if (files.length === 0) return null;
      files.sort().reverse();
      return path.join(this.localPath, files[0]);
    }
    throw new Error("getLatestBackup not implemented for " + this.providerType);
  }
  
  async readBackup(filePath) {
    if (this.providerType === 'local') {
       return fs.readFileSync(filePath, 'utf-8');
    }
    throw new Error("readBackup not implemented for " + this.providerType);
  }
}

module.exports = new BackupStorageProvider();
