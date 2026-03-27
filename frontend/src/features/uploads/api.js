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
  return apiClient.get('/upload/stats', {
    params: userId ? { user_id: userId } : undefined,
  });
}
