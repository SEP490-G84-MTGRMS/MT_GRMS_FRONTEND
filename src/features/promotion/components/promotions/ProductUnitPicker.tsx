import { useEffect, useState } from 'react';
import { productApi } from '../../../product/api/productApi';

export function ProductUnitPicker({ productId, baseUnit, value, onChange }: { productId?: string; baseUnit?: string; value?: string; onChange: (unit: string) => void }) {
  const [loaded, setLoaded] = useState<{ id: string; units: string[] } | null>(null);
  useEffect(() => {
    let active = true;
    if (productId) {
      void productApi.getProductUnits(productId).then(units => {
        if (active) setLoaded({ id: productId, units: units.map(unit => unit.unitName) });
      });
    }
    return () => { active = false; };
  }, [productId]);
  const units = productId ? [...new Set([baseUnit, ...(loaded?.id === productId ? loaded.units : [])].filter((unit): unit is string => Boolean(unit)))] : [];
  return <select className="form-select-control" disabled={!productId} value={value && units.includes(value) ? value : ''} onChange={e => onChange(e.target.value)} style={{ width: '100%' }}>
    <option value="" disabled>{productId ? 'Chọn đơn vị' : 'Chọn sản phẩm trước'}</option>
    {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
  </select>;
}
