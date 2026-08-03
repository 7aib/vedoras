import httpClient from './httpClient';

/**
 * Uploads an image and returns its public URL. The server stores to Cloudinary
 * when configured, otherwise to local `/uploads` storage served by the backend.
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('images', file);

  const res = await httpClient.post<{ images: string[] }>('/uploads/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30_000,
  });

  const url = res.data.images[0];
  if (!url) throw new Error('Upload returned no image');
  return url;
}

/** Deletes a previously uploaded image from storage. */
export async function deleteImage(url: string): Promise<void> {
  await httpClient.delete<null>('/uploads/images', { data: { url } });
}
