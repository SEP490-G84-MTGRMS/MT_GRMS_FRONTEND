import { httpClient } from '../api/httpClient';
import type { ApiResponse } from '../api/types';

export interface ImageUploadResponse {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Tải hình ảnh lên Cloudinary thông qua API backend an toàn
 * @param file Tệp hình ảnh được chọn từ máy client
 * @param folder Thư mục lưu trữ trên Cloudinary (mặc định: 'mtgrms/products')
 * @returns Đường dẫn HTTPS an toàn của hình ảnh
 */
export async function uploadImageToCloudinary(
  file: File,
  folder: string = 'mtgrms/products'
): Promise<string> {
  if (!file) {
    throw new Error('Vui lòng chọn tệp hình ảnh hợp lệ.');
  }

  // Kiểm tra dung lượng tối đa 5MB ở client trước khi gửi
  const maxSizeBytes = 5 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error('Kích thước ảnh vượt quá giới hạn tối đa 5MB.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await httpClient.post<ApiResponse<ImageUploadResponse>>('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (res.data?.success && res.data.data?.url) {
    return res.data.data.url;
  }

  throw new Error(res.data?.message || 'Không thể tải ảnh lên máy chủ.');
}

