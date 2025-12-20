const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

/**
 * AWS S3 Service for file uploads and management
 */
class S3Service {
  constructor() {
    this.client = null;
    this.bucket = null;
    this.recordingsFolder = 'recordings';
    this._initialized = false;
  }

  /**
   * Initialize S3 client and configuration (lazy initialization)
   * Can be called manually for early initialization
   */
  initialize() {
    this._initialize();
  }

  /**
   * Internal initialization method
   */
  _initialize() {
    if (this._initialized) {
      return;
    }

    this.bucket = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET;
    this.recordingsFolder = process.env.AWS_S3_RECORDINGS_FOLDER || 'recordings';

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'ap-south-1';

    if (!this.bucket || !accessKeyId || !secretAccessKey) {
      console.warn('AWS S3 credentials not configured. Recording uploads will fail.');
      this._initialized = true;
      return;
    }

    this.client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });

    console.log('✓ AWS S3 configured successfully');
    this._initialized = true;
  }

  /**
   * Upload file to S3
   * @param {string} localPath - Local file path
   * @param {string} s3Key - S3 object key
   * @param {string} contentType - Content type (default: video/mp4)
   * @returns {Promise<Object>} - { s3Url, s3Key }
   */
  async uploadFile(localPath, s3Key, contentType = 'video/mp4') {
    this._initialize();

    if (!this.bucket || !this.client) {
      throw new Error('AWS S3 bucket not configured');
    }

    try {
      const fileContent = fs.readFileSync(localPath);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
      });

      await this.client.send(command);

      const s3Url = `https://${this.bucket}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;

      return {
        s3Url,
        s3Key
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Upload recording to S3
   * @param {string} localPath - Local recording file path
   * @param {string} liveClassId - Live class ID
   * @returns {Promise<Object>} - { s3Url, s3Key }
   */
  async uploadRecording(localPath, liveClassId) {
    const timestamp = Date.now();
    const fileName = `recording_${liveClassId}_${timestamp}.mp4`;
    const s3Key = `${this.recordingsFolder}/${liveClassId}/${fileName}`;

    return await this.uploadFile(localPath, s3Key, 'video/mp4');
  }

  /**
   * Delete file from S3
   * @param {string} s3Key - S3 object key
   * @returns {Promise<void>}
   */
  async deleteFile(s3Key) {
    this._initialize();

    if (!this.bucket || !this.client) {
      throw new Error('AWS S3 bucket not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key
      });

      await this.client.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for private file access
   * @param {string} s3Key - S3 object key
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} - Presigned URL
   */
  async getPresignedUrl(s3Key, expiresIn = 3600) {
    this._initialize();

    if (!this.bucket || !this.client) {
      throw new Error('AWS S3 bucket not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        ResponseContentDisposition: 'inline'
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('S3 presigned URL error:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Download a file from S3 to local path
   * @param {string} s3Key - S3 object key
   * @param {string} destPath - Local destination path
   */
  async downloadToFile(s3Key, destPath) {
    this._initialize();

    if (!this.bucket || !this.client) {
      throw new Error('AWS S3 bucket not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key
      });

      const response = await this.client.send(command);
      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(destPath);
        response.Body.pipe(writeStream);
        response.Body.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      return destPath;
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error(`Failed to download file from S3: ${error.message}`);
    }
  }

  /**
   * Check if an object exists in S3 (HEAD request)
   * @param {string} s3Key
   * @returns {Promise<boolean>}
   */
  async objectExists(s3Key) {
    this._initialize();

    if (!this.bucket || !this.client) {
      throw new Error('AWS S3 bucket not configured');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: s3Key
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') {
        return false;
      }
      console.error('S3 head error:', error);
      throw error;
    }
  }

  /**
   * Check if S3 is configured
   * @returns {boolean}
   */
  isConfigured() {
    this._initialize();
    return !!(this.bucket && this.client && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  }
}

module.exports = new S3Service();

