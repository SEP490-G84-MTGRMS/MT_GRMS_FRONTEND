import { Package, Tags, Image } from 'lucide-react';
import type { MasterCatalogKpis } from '../../types/masterCatalog.types';

interface MasterCatalogKpiBannerProps {
  kpis: MasterCatalogKpis;
  isLoading?: boolean;
}

export const MasterCatalogKpiBanner = ({ kpis, isLoading = false }: MasterCatalogKpiBannerProps) => {
  const cards = [
    { label: 'Sản phẩm mẫu', value: kpis.totalProducts.toLocaleString('vi-VN'), icon: Package },
    { label: 'Thương hiệu', value: kpis.totalBrands.toLocaleString('vi-VN'), icon: Tags },
    { label: 'Sản phẩm có ảnh', value: kpis.imageCoveragePercent + '%', icon: Image },
  ];
  return (
    <div className="plans-kpis catalog-template-kpis">
      {cards.map(({ label, value, icon: Icon }) => (
        <article className="plans-kpi" key={label}><span>{label}</span>
          <strong>{isLoading ? '—' : value}</strong><span className="plans-kpi-icon"><Icon size={20} /></span></article>
      ))}
    </div>
  );
};
