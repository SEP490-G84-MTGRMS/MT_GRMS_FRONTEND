import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadImageToCloudinary } from '../cloudinary';
import { httpClient } from '../../api/httpClient';

vi.mock('../../api/httpClient', () => ({
  httpClient: {
    post: vi.fn(),
  },
}));

describe('uploadImageToCloudinary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('phải ném lỗi nếu không truyền file', async () => {
    await expect(uploadImageToCloudinary(null as any)).rejects.toThrow(
      'Vui lòng chọn tệp hình ảnh hợp lệ.'
    );
  });

  it('phải ném lỗi nếu file vượt quá 5MB', async () => {
    // 6MB dummy file
    const largeBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' });
    const largeFile = new File([largeBlob], 'large.png', { type: 'image/png' });

    await expect(uploadImageToCloudinary(largeFile)).rejects.toThrow(
      'Kích thước ảnh vượt quá giới hạn tối đa 5MB.'
    );
  });

  it('phải gọi POST /media/upload với FormData và trả về secure_url khi upload thành công', async () => {
    const dummyBlob = new Blob(['sample-image-content'], { type: 'image/jpeg' });
    const dummyFile = new File([dummyBlob], 'product.jpg', { type: 'image/jpeg' });

    const expectedUrl = 'https://res.cloudinary.com/dt8l0vdws/image/upload/v123/product.jpg';
    vi.mocked(httpClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          url: expectedUrl,
          publicId: 'mtgrms/products/product',
          format: 'jpg',
          bytes: 1024,
          width: 800,
          height: 800,
        },
      },
    });

    const result = await uploadImageToCloudinary(dummyFile, 'mtgrms/products');

    expect(result).toBe(expectedUrl);
    expect(httpClient.post).toHaveBeenCalledTimes(1);
    expect(httpClient.post).toHaveBeenCalledWith(
      '/media/upload',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  });

  it('phải ném lỗi với thông báo từ backend khi API trả về thất bại', async () => {
    const dummyBlob = new Blob(['content'], { type: 'image/png' });
    const dummyFile = new File([dummyBlob], 'bad.png', { type: 'image/png' });

    vi.mocked(httpClient.post).mockResolvedValueOnce({
      data: {
        success: false,
        message: 'Định dạng tệp không được hỗ trợ.',
      },
    });

    await expect(uploadImageToCloudinary(dummyFile)).rejects.toThrow(
      'Định dạng tệp không được hỗ trợ.'
    );
  });
});

