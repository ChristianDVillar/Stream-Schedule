import { apiClient } from '../../shared/api/client';

export async function uploadFileThroughBackend(file, bucket) {
  const formData = new FormData();
  formData.append('file', file);
  if (bucket) formData.append('bucket', bucket);
  return apiClient.post('/upload/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 5 * 60 * 1000,
  });
}

export async function deleteUpload(uploadId) {
  return apiClient.delete(`/upload/${uploadId}`);
}

export async function getVideoSignedUrl(filePath, expiresIn = 3600) {
  return apiClient.get('/upload/video-url', {
    params: { file_path: filePath, expiresIn },
  });
}

export async function getUploadStats(userId) {
  if (!userId) {
    return apiClient.get('/upload/stats');
  }
  const encodedUserId = encodeURIComponent(String(userId));
  try {
    // Canonical route in backend: GET /api/upload/stats/:user_id
    return await apiClient.get(`/upload/stats/${encodedUserId}`);
  } catch (err) {
    // Compatibility fallback for older deployments that may still expect query params.
    if (err?.response?.status === 404) {
      return apiClient.get('/upload/stats', {
        params: { user_id: userId },
      });
    }
    throw err;
  }
}
