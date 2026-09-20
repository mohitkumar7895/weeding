const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function putS3Object(bucket, key, body, region) {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKey || !secretKey) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required for S3 backups');
  }

  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    `/${key}`,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}/${key}`, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`S3 upload failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return `s3://${bucket}/${key}`;
}

class BackupStorageProvider {
  constructor() {
    this.providerType = process.env.BACKUP_STORAGE_PROVIDER || 'local';
    this.localPath = process.env.BACKUP_LOCAL_PATH || path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(this.localPath)) {
      fs.mkdirSync(this.localPath, { recursive: true });
    }
  }

  async saveBackup(filename, dataString) {
    const filePath = path.join(this.localPath, filename);
    fs.writeFileSync(filePath, dataString, 'utf-8');
    console.log(`[Storage] Saved backup locally to ${filePath}`);

    if (this.providerType === 's3') {
      const bucket = process.env.BACKUP_S3_BUCKET;
      const region = process.env.AWS_REGION || 'ap-south-1';
      if (!bucket) throw new Error('BACKUP_S3_BUCKET is required when BACKUP_STORAGE_PROVIDER=s3');
      const remote = await putS3Object(bucket, filename, dataString, region);
      console.log(`[Storage] Uploaded backup to ${remote}`);
      return remote;
    }

    return filePath;
  }

  async enforceRetention(retentionDays) {
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
        purgedCount++;
      }
    }
    return purgedCount;
  }

  async getLatestBackup() {
    const files = fs.readdirSync(this.localPath).filter((f) => f.endsWith('.json'));
    if (files.length === 0) return null;
    files.sort().reverse();
    return path.join(this.localPath, files[0]);
  }

  async readBackup(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
  }
}

module.exports = new BackupStorageProvider();
