import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopAnnouncementBar } from './components/TopAnnouncementBar';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { FloatingFeaturesCard } from './components/FloatingFeaturesCard';
import { SolutionShowcaseSection } from './components/SolutionShowcaseSection';
import { ServicesEcosystemSection } from './components/ServicesEcosystemSection';
import { FaqSection } from './components/FaqSection';
import { CtaBanner } from './components/CtaBanner';
import { Footer } from './components/Footer';
import { FloatingChatButton } from './components/FloatingChatButton';

export const HomePage: FC = () => {
  const navigate = useNavigate();
  const openTrialRegistration = () => navigate('/auth/register?intent=trial');

  return (
    <div className="home-page-wrapper">
      {/* 1. Top Announcement Bar */}
      <TopAnnouncementBar />

      {/* 2. Site Header / Navigation - Link trực tiếp sang trang Đăng nhập /auth/login */}
      <Navbar
        onOpenLogin={() => navigate('/auth/login')}
        onOpenTrial={openTrialRegistration}
      />

      <main>
        {/* 3. Hero Section (Tiêu đề, CTA, ảnh chủ tiệm, floating badges) */}
        <HeroSection onOpenTrial={openTrialRegistration} />

        {/* 4. Floating 3-Features Banner (Thẻ bo tròn 28px) */}
        <FloatingFeaturesCard />

        {/* 5. Giải Pháp Quản Lý Tiệm Tạp Hóa (Accordion Trái + Visual Phải) */}
        <SolutionShowcaseSection />

        {/* 6. Hệ Sinh Thái Dịch Vụ & Tiện Ích (Lưới 3x3 Cards) */}
        <ServicesEcosystemSection />

        {/* 7. FAQ Accordion (Câu hỏi thường gặp) */}
        <FaqSection />

        {/* 8. Final CTA Banner (Bo góc 28px) */}
        <CtaBanner onOpenTrial={openTrialRegistration} />
      </main>

      {/* 9. Site Footer */}
      <Footer />

      <FloatingChatButton onClick={openTrialRegistration} />
    </div>
  );
};

export default HomePage;
