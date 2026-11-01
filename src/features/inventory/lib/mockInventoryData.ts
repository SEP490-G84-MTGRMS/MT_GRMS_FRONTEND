import type { InventoryItem } from '../types/inventory.types';

const CAT: Record<InventoryItem['category'], string> = {
  Dairy: 'Sữa',
  Beverage: 'Đồ uống',
  Fresh: 'Tươi sống',
  Frozen: 'Đông lạnh',
  RTE: 'Ăn liền',
  Snack: 'Snack',
  'Personal Care': 'Chăm sóc cá nhân',
};

const row = (
  item: Omit<InventoryItem, 'id' | 'categoryLabel' | 'available' | 'totalValue' | 'status'> & {
    status?: InventoryItem['status'];
  }
): InventoryItem => {
  const available = Math.max(0, item.onHand - item.committed);
  const status =
    item.status ??
    (item.onHand <= 0 ? 'Out' : item.onHand <= item.reorderPoint ? 'Low' : 'OK');
  return {
    ...item,
    id: `${item.sku}-${item.branchId}`,
    categoryLabel: CAT[item.category],
    available,
    totalValue: item.onHand * item.avgCost,
    status,
  };
};

export const INVENTORY_BRANCHES = [
  { id: 'BR-01', name: 'BR-01 Main Store' },
  { id: 'BR-02', name: 'BR-02 Thu Duc Hub' },
];

export const INVENTORY_CATEGORIES: InventoryItem['category'][] = [
  'Dairy',
  'Beverage',
  'Fresh',
  'Frozen',
  'RTE',
  'Snack',
  'Personal Care',
];

export const INVENTORY_LOCATIONS = [
  'A-01-01',
  'A-01-02',
  'B-02-01',
  'C-COOL-01',
  'F-FZ-01',
  'H-HOT-01',
];

export const MOCK_INVENTORY_ITEMS: InventoryItem[] = [
  row({ sku: 'DY-SUA-01', productName: 'Sữa tươi Vinamilk 1L', category: 'Dairy', branchId: 'BR-01', branchName: 'BR-01', location: 'C-COOL-01', unit: 'Chai', onHand: 86, committed: 10, onOrder: 40, reorderPoint: 40, avgCost: 32000, batchCount: 2 }),
  row({ sku: 'DY-SC-02', productName: 'Sữa chua Nếp Cẩm 100g', category: 'Dairy', branchId: 'BR-01', branchName: 'BR-01', location: 'C-COOL-01', unit: 'Hộp', onHand: 6, committed: 2, onOrder: 50, reorderPoint: 20, avgCost: 24000, batchCount: 1 }),
  row({ sku: 'DY-SUA-01', productName: 'Sữa tươi Vinamilk 1L', category: 'Dairy', branchId: 'BR-02', branchName: 'BR-02', location: 'C-COOL-01', unit: 'Chai', onHand: 18, committed: 5, onOrder: 30, reorderPoint: 30, avgCost: 31500, batchCount: 1 }),
  row({ sku: 'BV-PEPSI-01', productName: 'Pepsi Lon 330ml', category: 'Beverage', branchId: 'BR-01', branchName: 'BR-01', location: 'A-01-01', unit: 'Lon', onHand: 240, committed: 20, onOrder: 0, reorderPoint: 100, avgCost: 5000, batchCount: 3 }),
  row({ sku: 'BV-ST-01', productName: 'Sting đỏ 330ml', category: 'Beverage', branchId: 'BR-01', branchName: 'BR-01', location: 'A-01-01', unit: 'Lon', onHand: 80, committed: 0, onOrder: 0, reorderPoint: 50, avgCost: 8000, batchCount: 1 }),
  row({ sku: 'BV-TRA-01', productName: 'Trà xanh 0 độ 500ml', category: 'Beverage', branchId: 'BR-01', branchName: 'BR-01', location: 'A-01-02', unit: 'Chai', onHand: 12, committed: 4, onOrder: 60, reorderPoint: 40, avgCost: 9000, batchCount: 1 }),
  row({ sku: 'BV-PEPSI-01', productName: 'Pepsi Lon 330ml', category: 'Beverage', branchId: 'BR-02', branchName: 'BR-02', location: 'A-01-01', unit: 'Lon', onHand: 90, committed: 10, onOrder: 0, reorderPoint: 60, avgCost: 5000, batchCount: 1 }),
  row({ sku: 'FR-CAI-01', productName: 'Rau cải xanh búp 500g', category: 'Fresh', branchId: 'BR-01', branchName: 'BR-01', location: 'C-COOL-01', unit: 'Gói', onHand: 10, committed: 3, onOrder: 30, reorderPoint: 25, avgCost: 18000, batchCount: 1 }),
  row({ sku: 'FR-CAI-01', productName: 'Rau cải xanh búp 500g', category: 'Fresh', branchId: 'BR-02', branchName: 'BR-02', location: 'C-COOL-01', unit: 'Gói', onHand: 28, committed: 5, onOrder: 0, reorderPoint: 20, avgCost: 18000, batchCount: 1 }),
  row({ sku: 'FR-TRUNG-01', productName: 'Trứng gà sạch Hộp 10', category: 'Fresh', branchId: 'BR-01', branchName: 'BR-01', location: 'C-COOL-01', unit: 'Hộp', onHand: 45, committed: 8, onOrder: 0, reorderPoint: 20, avgCost: 32000, batchCount: 2 }),
  row({ sku: 'FZ-HAO-01', productName: 'Há cảo tôm đông lạnh', category: 'Frozen', branchId: 'BR-01', branchName: 'BR-01', location: 'F-FZ-01', unit: 'Gói', onHand: 3, committed: 1, onOrder: 20, reorderPoint: 15, avgCost: 85000, batchCount: 1 }),
  row({ sku: 'FZ-PIZZA-01', productName: 'Pizza hải sản 300g', category: 'Frozen', branchId: 'BR-01', branchName: 'BR-01', location: 'F-FZ-01', unit: 'Cái', onHand: 22, committed: 2, onOrder: 0, reorderPoint: 10, avgCost: 95000, batchCount: 1 }),
  row({ sku: 'FZ-HAO-01', productName: 'Há cảo tôm đông lạnh', category: 'Frozen', branchId: 'BR-02', branchName: 'BR-02', location: 'F-FZ-01', unit: 'Gói', onHand: 16, committed: 4, onOrder: 0, reorderPoint: 10, avgCost: 85000, batchCount: 1 }),
  row({ sku: 'RTE-BM-02', productName: 'Bánh mì Sandwich chà bông', category: 'RTE', branchId: 'BR-01', branchName: 'BR-01', location: 'H-HOT-01', unit: 'Cái', onHand: 0, committed: 0, onOrder: 30, reorderPoint: 15, avgCost: 22000, batchCount: 0, status: 'Out' }),
  row({ sku: 'RTE-SAL-01', productName: 'Salad gà xé phay', category: 'RTE', branchId: 'BR-01', branchName: 'BR-01', location: 'H-HOT-01', unit: 'Hộp', onHand: 18, committed: 3, onOrder: 0, reorderPoint: 10, avgCost: 38000, batchCount: 1 }),
  row({ sku: 'RTE-COM-01', productName: 'Cơm gà xối mỡ', category: 'RTE', branchId: 'BR-02', branchName: 'BR-02', location: 'H-HOT-01', unit: 'Hộp', onHand: 5, committed: 2, onOrder: 20, reorderPoint: 12, avgCost: 35000, batchCount: 1 }),
  row({ sku: 'SN-POT-50', productName: "Bánh khoai tây O'Star 50g", category: 'Snack', branchId: 'BR-01', branchName: 'BR-01', location: 'B-02-01', unit: 'Gói', onHand: 8, committed: 3, onOrder: 50, reorderPoint: 30, avgCost: 8500, batchCount: 1 }),
  row({ sku: 'SN-OREO-01', productName: 'Bánh Oreo vị Vanilla 133g', category: 'Snack', branchId: 'BR-01', branchName: 'BR-01', location: 'B-02-01', unit: 'Thanh', onHand: 55, committed: 5, onOrder: 0, reorderPoint: 25, avgCost: 12000, batchCount: 2 }),
  row({ sku: 'SN-POT-50', productName: "Bánh khoai tây O'Star 50g", category: 'Snack', branchId: 'BR-02', branchName: 'BR-02', location: 'B-02-01', unit: 'Gói', onHand: 40, committed: 6, onOrder: 0, reorderPoint: 20, avgCost: 8500, batchCount: 1 }),
  row({ sku: 'PC-DAU-01', productName: 'Dầu gội Clear 650ml', category: 'Personal Care', branchId: 'BR-01', branchName: 'BR-01', location: 'A-01-02', unit: 'Chai', onHand: 35, committed: 4, onOrder: 0, reorderPoint: 15, avgCost: 89000, batchCount: 2 }),
  row({ sku: 'PC-KEM-01', productName: 'Kem đánh răng Colgate 200g', category: 'Personal Care', branchId: 'BR-01', branchName: 'BR-01', location: 'A-01-02', unit: 'Hộp', onHand: 9, committed: 1, onOrder: 30, reorderPoint: 20, avgCost: 28000, batchCount: 1 }),
  row({ sku: 'PC-DAU-01', productName: 'Dầu gội Clear 650ml', category: 'Personal Care', branchId: 'BR-02', branchName: 'BR-02', location: 'A-01-02', unit: 'Chai', onHand: 20, committed: 2, onOrder: 0, reorderPoint: 10, avgCost: 89000, batchCount: 1 }),
  row({ sku: 'BV-AQUA-01', productName: 'Nước suối Aquafina 500ml', category: 'Beverage', branchId: 'BR-01', branchName: 'BR-01', location: 'A-01-01', unit: 'Chai', onHand: 320, committed: 40, onOrder: 0, reorderPoint: 100, avgCost: 3000, batchCount: 4 }),
  row({ sku: 'DY-SUA-HOP-01', productName: 'Sữa tiệt trùng Vinamilk 180ml', category: 'Dairy', branchId: 'BR-01', branchName: 'BR-01', location: 'C-COOL-01', unit: 'Hộp', onHand: 100, committed: 15, onOrder: 0, reorderPoint: 50, avgCost: 8000, batchCount: 2 }),
  row({ sku: 'FR-THIT-01', productName: 'Thịt heo xay Vissan 300g', category: 'Fresh', branchId: 'BR-02', branchName: 'BR-02', location: 'C-COOL-01', unit: 'Khay', onHand: 0, committed: 0, onOrder: 20, reorderPoint: 10, avgCost: 75000, batchCount: 0, status: 'Out' }),
];
