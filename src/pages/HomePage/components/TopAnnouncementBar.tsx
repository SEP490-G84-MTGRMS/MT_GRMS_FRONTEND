import type { FC } from 'react';

export const TopAnnouncementBar: FC = () => {
  return (
    <aside className="top-announcement" aria-label="Thông báo tính năng mới">
      <div className="container top-anno-inner">
        <span className="anno-badge">TẠP HÓA THÔNG MINH</span>
        <span className="anno-text">
          Tự động cảnh báo hàng cận hạn sử dụng: Giảm tối đa hàng hư hỏng, bảo vệ vốn cho chủ tiệm.
        </span>
        <a href="#giai-phap" className="anno-link">
          Khám phá ngay &rarr;
        </a>
      </div>
    </aside>
  );
};
