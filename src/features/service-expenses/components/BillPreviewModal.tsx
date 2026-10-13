import { type FC, useState } from 'react';
import { ExternalLink, ImageOff, X } from 'lucide-react';

interface BillPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title: string;
}

export const BillPreviewModal: FC<BillPreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#f7faff]">
          <h3 className="font-bold text-gray-900 text-base truncate max-w-[80%]">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-gray-400 hover:text-[#0066ff] rounded-full hover:bg-gray-100 transition-colors"
              title="Mở ảnh trong tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="p-6 flex items-center justify-center bg-gray-50 min-h-[320px] max-h-[70vh] overflow-auto">
          {hasError ? (
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <ImageOff className="w-8 h-8" />
              </div>
              <p className="font-semibold text-gray-800">
                Không thể tải ảnh hóa đơn chứng từ
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Đường dẫn liên kết không tồn tại hoặc đã hết hạn truy cập. Bạn có
                thể mở thử đường dẫn ngoài bằng nút liên kết phía trên.
              </p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="Hóa đơn chứng từ chi phí"
              onError={() => setHasError(true)}
              className="max-h-[60vh] max-w-full rounded-2xl shadow-sm object-contain border border-gray-200"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-[#0066ff] hover:bg-[#0052cc] rounded-full transition-colors"
          >
            Đóng xem
          </button>
        </div>
      </div>
    </div>
  );
};
