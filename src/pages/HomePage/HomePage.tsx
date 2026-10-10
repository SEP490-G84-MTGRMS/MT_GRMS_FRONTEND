import { useState, useCallback } from 'react';
import type { FC } from 'react';
import { TopAnnouncementBar } from './components/TopAnnouncementBar';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { FloatingFeaturesCard } from './components/FloatingFeaturesCard';
import { SolutionShowcaseSection } from './components/SolutionShowcaseSection';
import { ServicesEcosystemSection } from './components/ServicesEcosystemSection';
import { FaqSection } from './components/FaqSection';
import { CtaBanner } from './components/CtaBanner';
import { Footer } from './components/Footer';
import { TrialModal } from './components/TrialModal';
import { LoginModal } from './components/LoginModal';
import { FloatingChatButton } from './components/FloatingChatButton';
import { Toast, type ToastMessage } from './components/Toast';

export const HomePage: FC = () => {
  const [isTrialOpen, setIsTrialOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const handleTrialSuccess = (storeName: string) => {
    showToast(`🎉 Đã kích hoạt dùng thử thành công cho tiệm: ${storeName}`);
  };

  const handleLoginSuccess = () => {
    showToast('✅ Đăng nhập thành công! Đang chuyển hướng vào quầy POS...');
  };

  return (
    <div className="home-page-wrapper">
      {/* 1. Top Announcement Bar */}
      <TopAnnouncementBar />

      {/* 2. Site Header / Navigation */}
      <Navbar
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenTrial={() => setIsTrialOpen(true)}
      />

      <main>
        {/* 3. Hero Section (Tiêu đề, CTA, ảnh chủ tiệm, floating badges) */}
        <HeroSection onOpenTrial={() => setIsTrialOpen(true)} />

        {/* 4. Floating 3-Features Banner (Thẻ bo tròn 28px) */}
        <FloatingFeaturesCard />

        {/* 5. Giải Pháp Quản Lý Tiệm Tạp Hóa (Accordion Trái + Visual Phải) */}
        <SolutionShowcaseSection />

        {/* 6. Hệ Sinh Thái Dịch Vụ & Tiện Ích (Lưới 3x3 Cards) */}
        <ServicesEcosystemSection />

        {/* 7. FAQ Accordion (Câu hỏi thường gặp) */}
        <FaqSection />

        {/* 8. Final CTA Banner (Bo góc 28px) */}
        <CtaBanner onOpenTrial={() => setIsTrialOpen(true)} />
      </main>

      {/* 9. Site Footer */}
      <Footer />

      {/* 10. Modals */}
      <TrialModal
        isOpen={isTrialOpen}
        onClose={() => setIsTrialOpen(false)}
        onSuccess={handleTrialSuccess}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* 11. Floating Chat Trigger */}
      <FloatingChatButton onClick={() => setIsTrialOpen(true)} />

      {/* 12. Toast Feedback Area */}
      <Toast toasts={toasts} />
    </div>
  );
};

export default HomePage;
