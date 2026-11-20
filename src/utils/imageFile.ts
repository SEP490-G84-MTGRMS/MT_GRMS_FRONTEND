/**
 * Đọc tệp ảnh cục bộ thành data URL (base64) để xem trước trên form
 * trước khi gửi lên backend lưu trữ lên Cloudinary.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Không thể đọc dữ liệu ảnh.'));
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh đã chọn.'));
    reader.readAsDataURL(file);
  });
}
