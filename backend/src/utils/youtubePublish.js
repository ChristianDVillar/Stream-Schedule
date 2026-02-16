/**
 * YouTube Publishing Utility
 * Handles video uploads to YouTube using OAuth2
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { google } from 'googleapis';
import fs from 'fs';
import logger from './logger.js';

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - OAuth refresh token
 * @returns {Promise<{ accessToken: string, expiresAt: Date }>}
 */
async function refreshAccessToken(refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/youtube/callback`
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return {
      accessToken: credentials.access_token,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null
    };
  } catch (error) {
    logger.error('Failed to refresh YouTube access token', { error: error.message });
    throw new Error(`Failed to refresh access token: ${error.message}`);
  }
}

/**
 * Get authenticated YouTube client
 * @param {string} refreshToken - OAuth refresh token
 * @returns {Promise<google.youtube_v3.Youtube>}
 */
async function getYouTubeClient(refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/youtube/callback`
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Refresh token if needed
  const { credentials } = await oauth2Client.refreshAccessToken().catch(async () => {
    // If refresh fails, try to get new token
    const refreshed = await refreshAccessToken(refreshToken);
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
      access_token: refreshed.accessToken
    });
    return { credentials: { access_token: refreshed.accessToken } };
  });

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: credentials.access_token
  });

  return google.youtube({ version: 'v3', auth: oauth2Client });
}

/**
 * Download file from URL to temporary file
 * @param {string} url - File URL
 * @param {string} tempPath - Temporary file path
 * @returns {Promise<string>} Path to downloaded file
 */
async function downloadFile(url, tempPath) {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    return tempPath;
  } catch (error) {
    logger.error('Failed to download file for YouTube upload', {
      url,
      error: error.message
    });
    throw error;
  }
}

/**
 * Upload video to YouTube
 * @param {string} refreshToken - OAuth refresh token
 * @param {string} videoPath - Path to video file (local) or URL to download
 * @param {object} options - Video options
 * @param {string} options.title - Video title (required, max 100 chars)
 * @param {string} [options.description] - Video description (max 5000 chars)
 * @param {string[]} [options.tags] - Video tags
 * @param {string} [options.privacyStatus='private'] - Privacy status: private, unlisted, public
 * @param {string} [options.categoryId='22'] - YouTube category ID (22 = People & Blogs)
 * @param {string} [options.defaultLanguage='es'] - Default language
 * @returns {Promise<{ videoId: string, url: string }>}
 */
export async function uploadVideoToYouTube(refreshToken, videoPath, options = {}) {
  const {
    title,
    description = '',
    tags = [],
    privacyStatus = 'private',
    categoryId = '22',
    defaultLanguage = 'es'
  } = options;

  if (!title || title.length > 100) {
    throw new Error('Video title is required and must be 100 characters or less');
  }

  if (description && description.length > 5000) {
    throw new Error('Video description must be 5000 characters or less');
  }

  let localVideoPath = videoPath;
  let isTempFile = false;

  try {
    // If videoPath is a URL, download it first
    if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
      const tempPath = `/tmp/youtube-upload-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
      localVideoPath = await downloadFile(videoPath, tempPath);
      isTempFile = true;
    }

    // Check if file exists
    if (!fs.existsSync(localVideoPath)) {
      throw new Error(`Video file not found: ${localVideoPath}`);
    }

    const fileSize = fs.statSync(localVideoPath).size;
    logger.info('Uploading video to YouTube', {
      title,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
      privacyStatus
    });

    // Get authenticated YouTube client
    const youtube = await getYouTubeClient(refreshToken);

    // Prepare video metadata
    const requestBody = {
      snippet: {
        title: title.slice(0, 100),
        description: description.slice(0, 5000),
        tags: tags.slice(0, 500), // YouTube allows up to 500 tags
        categoryId,
        defaultLanguage
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false
      }
    };

    // Upload video
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody,
      media: {
        body: fs.createReadStream(localVideoPath),
        mimeType: 'video/*'
      }
    });

    const videoId = response.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    logger.info('Video uploaded to YouTube successfully', {
      videoId,
      videoUrl,
      title
    });

    return {
      videoId,
      url: videoUrl
    };
  } catch (error) {
    logger.error('Failed to upload video to YouTube', {
      title,
      error: error.message,
      stack: error.stack
    });

    // Provide more specific error messages
    if (error.message.includes('quota')) {
      throw new Error('YouTube API quota exceeded. Please try again later.');
    }
    if (error.message.includes('unauthorized') || error.message.includes('invalid_grant')) {
      throw new Error('YouTube authentication expired. Please reconnect your YouTube account.');
    }
    if (error.message.includes('file size') || error.message.includes('too large')) {
      throw new Error('Video file is too large for YouTube upload.');
    }

    throw new Error(`Failed to upload video: ${error.message}`);
  } finally {
    // Clean up temporary file if we downloaded it
    if (isTempFile && fs.existsSync(localVideoPath)) {
      try {
        fs.unlinkSync(localVideoPath);
        logger.debug('Cleaned up temporary video file', { path: localVideoPath });
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temporary file', {
          path: localVideoPath,
          error: cleanupError.message
        });
      }
    }
  }
}

/**
 * Upload video from buffer (useful for Supabase downloads)
 * @param {string} refreshToken - OAuth refresh token
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {object} options - Video options (same as uploadVideoToYouTube)
 * @returns {Promise<{ videoId: string, url: string }>}
 */
export async function uploadVideoBufferToYouTube(refreshToken, videoBuffer, options = {}) {
  const tempPath = `/tmp/youtube-upload-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
  
  try {
    fs.writeFileSync(tempPath, videoBuffer);
    return await uploadVideoToYouTube(refreshToken, tempPath, options);
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (error) {
        logger.warn('Failed to cleanup temporary buffer file', { error: error.message });
      }
    }
  }
}
