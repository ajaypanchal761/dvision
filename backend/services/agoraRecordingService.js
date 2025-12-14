const axios = require('axios');
const fs = require('fs');
const path = require('path');
const agoraService = require('./agoraService');

/**
 * Lightweight wrapper around Agora Cloud Recording REST APIs.
 * This starts/stops recording, then downloads the resulting file so it can be
 * pushed to S3 and removed locally.
 *
 * Note: Agora Cloud Recording uploads directly to cloud storage when provided.
 * We additionally download the generated file (if a URL is returned) to the
 * local recordings folder to satisfy the "local -> S3 -> cleanup" flow.
 */
class AgoraRecordingService {
  constructor() {
    this.appId = process.env.AGORA_APP_ID;
    this.customerId = process.env.AGORA_CUSTOMER_ID;
    this.customerSecret = process.env.AGORA_CUSTOMER_CERTIFICATE || process.env.AGORA_CUSTOMER_SECRET;
    this.region = process.env.AGORA_RECORDING_REGION || 'AP';
    this.baseUrl = this.appId
      ? `https://api.agora.io/v1/apps/${this.appId}/cloud_recording`
      : null;
  }

  _authHeader() {
    if (!this.customerId || !this.customerSecret) {
      throw new Error('Agora recording credentials not configured');
    }
    const basic = Buffer.from(`${this.customerId}:${this.customerSecret}`).toString('base64');
    return { Authorization: `Basic ${basic}` };
  }

  async acquire(channelName, uid) {
    if (!this.baseUrl) throw new Error('Agora appId not configured for recording');
    const url = `${this.baseUrl}/acquire`;
    console.log('[Recording] Acquire request', { channelName, uid });
    const resp = await axios.post(
      url,
      {
        cname: channelName,
        uid: String(uid || 0),
        clientRequest: {
          resourceExpiredHour: 24
        }
      },
      { headers: this._authHeader() }
    );
    console.log('[Recording] Acquire response', resp.data);
    return resp.data; // contains resourceId
  }

  async start(resourceId, channelName, uid, liveClassId) {
    if (!this.baseUrl) throw new Error('Agora appId not configured for recording');

    // Generate a token for the recorder
    const token = agoraService.generateRtcToken(channelName, uid || 0);

    // Storage config – if AWS creds present, let Agora push directly to S3
    const bucket = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET;
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const recordFolder = process.env.AWS_S3_RECORDINGS_FOLDER || 'recordings';

    const storageConfig =
      bucket && accessKey && secretKey
        ? {
            vendor: 2, // 2 = AWS
            region: 14, // ap-south-1 per Agora doc; adjust via env if needed
            bucket,
            accessKey,
            secretKey,
            fileNamePrefix: [recordFolder, String(liveClassId || channelName)]
          }
        : undefined;

    const url = `${this.baseUrl}/resourceid/${resourceId}/mode/mix/start`;
    const resp = await axios.post(
      url,
      {
        cname: channelName,
        uid: String(uid || 0),
        clientRequest: {
          token,
          recordingConfig: {
            channelType: 1,
            streamTypes: 2, // audio+video
            audioProfile: 1,
            maxIdleTime: 120
          },
          // If storageConfig is provided, Agora will upload to S3 directly.
          storageConfig
        }
      },
      { headers: this._authHeader() }
    );
    console.log('[Recording] Start response', resp.data);
    return resp.data; // contains sid
  }

  async stop(resourceId, sid, channelName, uid) {
    if (!this.baseUrl) throw new Error('Agora appId not configured for recording');
    const url = `${this.baseUrl}/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`;
    console.log('[Recording] Stop request', { resourceId, sid, channelName, uid });
    const resp = await axios.post(
      url,
      {
        cname: channelName,
        uid: String(uid || 0),
        clientRequest: {}
      },
      { headers: this._authHeader() }
    );
    console.log('[Recording] Stop response', resp.data);
    return resp.data; // contains fileList
  }

  /**
   * Build download URL for a recording file stored on Agora cloud
   * (when no 3rd-party storage was configured).
   */
  getDownloadUrl(resourceId, sid, fileName) {
    if (!this.baseUrl) throw new Error('Agora appId not configured for recording');
    const encoded = encodeURIComponent(fileName);
    return `${this.baseUrl}/resourceid/${resourceId}/sid/${sid}/mode/mix/file/${encoded}`;
  }

  /**
   * Download a recording file that is stored on Agora cloud (auth required).
   */
  async downloadRecordingFile(resourceId, sid, fileName, destPath) {
    const fileUrl = this.getDownloadUrl(resourceId, sid, fileName);
    console.log('[Recording] Downloading (Agora cloud)', { fileUrl, destPath });
    const resp = await axios.get(fileUrl, {
      responseType: 'stream',
      headers: this._authHeader()
    });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(destPath);
      resp.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    console.log('[Recording] Download complete', { destPath });
    return destPath;
  }

  /**
   * Download a remote file to local disk.
   * @param {string} fileUrl
   * @param {string} destPath
   * @returns {Promise<string>} local path
   */
  async downloadFile(fileUrl, destPath) {
    console.log('[Recording] Downloading file', { fileUrl, destPath });
    const resp = await axios.get(fileUrl, { responseType: 'stream' });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(destPath);
      resp.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    console.log('[Recording] Download complete', { destPath });
    return destPath;
  }

  /**
   * Query recording file list after stop (polling if needed).
   */
  async query(resourceId, sid) {
    if (!this.baseUrl) throw new Error('Agora appId not configured for recording');
    const url = `${this.baseUrl}/resourceid/${resourceId}/sid/${sid}/mode/mix/query`;
    console.log('[Recording] Query request', { resourceId, sid });
    const resp = await axios.get(url, { headers: this._authHeader() });
    console.log('[Recording] Query response', resp.data);
    return resp.data;
  }

  /**
   * Helper to wait for recording file availability and then download.
   * Retries query + download to handle eventual consistency on Agora OSS.
   */
  async downloadRecordingWithRetry({ resourceId, sid, fileName, destPath, maxAttempts = 5, delayMs = 3000 }) {
    let attempt = 0;
    let lastError = null;
    let queryStatus = null;
    
    while (attempt < maxAttempts) {
      attempt += 1;
      
      // First, check recording status via query
      try {
        queryStatus = await this.query(resourceId, sid);
        const status = queryStatus?.serverResponse?.status;
        
        // Status: 0=idle, 1=recording, 2=stopped, 3=error
        if (status === 3) {
          throw new Error('Recording status is error. Recording may have failed.');
        }
        
        // If status is 1 (still recording), wait longer
        if (status === 1) {
          console.log(`[Recording] Still recording (status: ${status}), waiting longer...`);
          await new Promise(r => setTimeout(r, delayMs * 2));
          continue;
        }
        
        // Check if fileList exists in query response
        const fileList = queryStatus?.serverResponse?.fileList || queryStatus?.fileList;
        if (!fileList || (Array.isArray(fileList) && fileList.length === 0)) {
          console.log(`[Recording] No fileList in query response (attempt ${attempt}/${maxAttempts}), waiting...`);
          if (attempt < maxAttempts) {
            // Exponential backoff: increase delay with each attempt
            const backoffDelay = delayMs * Math.pow(1.5, attempt - 1);
            await new Promise(r => setTimeout(r, backoffDelay));
            continue;
          } else {
            throw new Error('Recording fileList not available after all retries');
          }
        }
        
        console.log(`[Recording] Query successful, fileList found (attempt ${attempt}/${maxAttempts})`);
      } catch (qErr) {
        // If query returns 404, recording doesn't exist
        if (qErr?.response?.status === 404) {
          console.warn(`[Recording] Query returned 404 - recording may not exist (attempt ${attempt}/${maxAttempts})`);
          if (attempt < maxAttempts) {
            // Exponential backoff for 404s
            const backoffDelay = delayMs * Math.pow(2, attempt - 1);
            console.log(`[Recording] Retry query attempt ${attempt}/${maxAttempts} after ${backoffDelay}ms delay`);
            await new Promise(r => setTimeout(r, backoffDelay));
            continue;
          } else {
            throw new Error('Recording not found after all retries. The recording may not have been created successfully.');
          }
        }
        // For other query errors, log and continue to try download
        console.warn('[Recording] Query error (non-404):', qErr?.message || qErr);
      }
      
      // Try to download the file
      try {
        await this.downloadRecordingFile(resourceId, sid, fileName, destPath);
        console.log(`[Recording] Download successful on attempt ${attempt}`);
        return destPath;
      } catch (err) {
        lastError = err;
        
        // If 404, wait and retry
        if (err?.response?.status === 404) {
          console.log(`[Recording] Download 404 (attempt ${attempt}/${maxAttempts}), retrying...`);
          if (attempt < maxAttempts) {
            // Exponential backoff
            const backoffDelay = delayMs * Math.pow(1.5, attempt - 1);
            await new Promise(r => setTimeout(r, backoffDelay));
            continue;
          }
        }
        
        // For other errors, break immediately
        console.error('[Recording] Download error (non-404):', err?.message || err);
        break;
      }
    }
    
    // If we exhausted all attempts, throw the last error
    const errorMsg = lastError?.response?.status === 404
      ? `Recording file not available after ${maxAttempts} attempts. The recording may still be processing or may have failed.`
      : lastError?.message || 'Failed to download recording';
    
    throw new Error(errorMsg);
  }
}

module.exports = new AgoraRecordingService();

