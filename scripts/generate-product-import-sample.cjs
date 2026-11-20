const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');

const outputDirectory = path.resolve(__dirname, '..', 'docs', 'samples');
const outputPath = path.join(outputDirectory, 'DanhMucHangHoa_Mau_20_Dong.xlsx');

const categories = [
  { code: 'WATER', name: 'Nước Giải Khát' },
  { code: 'MILK', name: 'Sữa' },
  { code: 'FAMILY', name: 'Đồ Gia Dụng' },
  { code: 'FOOD', name: 'Đồ Nấu Ăn' },
];

const productNames = [
  'Nước khoáng thiên nhiên 500ml',
  'Nước cam ép 1L',
  'Trà xanh không đường 455ml',
  'Nước tăng lực 330ml',
  'Nước dừa tươi 1L',
  'Sữa tươi không đường 1L',
  'Sữa chua uống dâu 180ml',
  'Sữa đặc có đường 380g',
  'Sữa hạt óc chó 180ml',
  'Sữa tươi tiệt trùng 220ml',
  'Nước rửa chén hương chanh 750ml',
  'Khăn giấy đa năng 2 lớp',
  'Túi rác tự hủy cỡ trung',
  'Nước lau sàn hương hoa 1L',
  'Màng bọc thực phẩm 30m',
  'Dầu ăn thực vật 1L',
  'Nước mắm truyền thống 500ml',
  'Đường tinh luyện 1kg',
  'Hạt nêm thịt heo 400g',
  'Mì chính cao cấp 454g',
];

const rows = productNames.map((name, index) => {
  const category = categories[Math.floor(index / 5)];
  const itemNumber = index + 1;
  const sellingPrice = 12000 + index * 2500;
  const costPrice = Math.round(sellingPrice * 0.72 / 100) * 100;

  return {
    'Mã hàng': `IMP-DEMO-${String(itemNumber).padStart(3, '0')}`,
    'Tên hàng (*)': name,
    'Mã nhóm hàng (*)': category.code,
    'Tên nhóm hàng': category.name,
    'Mã vạch': `29900000${String(itemNumber).padStart(5, '0')}`,
    'ĐVT cơ bản': itemNumber % 4 === 0 ? 'Hộp' : itemNumber % 3 === 0 ? 'Gói' : 'Chai',
    'Giá bán': sellingPrice,
    'Giá vốn': costPrice,
    'Tồn tối thiểu': 5 + (index % 4) * 5,
    'Tồn tối đa': 50 + (index % 5) * 25,
    'Trạng thái': index === 19 ? 'Discontinued' : 'Active',
    'Quản lý lô': index % 3 === 0 ? 'Có' : 'Không',
    'Cho phép đóng gói lại': category.code === 'FOOD' && index % 2 === 1 ? 'Có' : 'Không',
    'Giá bán hàng đóng gói/kg': category.code === 'FOOD' && index % 2 === 1 ? sellingPrice * 2 : '',
    'Mô tả': `Sản phẩm mẫu import số ${itemNumber} thuộc nhóm ${category.name}`,
    'Ghi chú nội bộ': 'Dữ liệu mẫu dùng để kiểm thử import Excel',
  };
});

const worksheet = XLSX.utils.json_to_sheet(rows);
worksheet['!cols'] = [
  { wch: 18 }, { wch: 32 }, { wch: 20 }, { wch: 24 }, { wch: 18 },
  { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
  { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 24 }, { wch: 36 }, { wch: 42 },
];

const range = XLSX.utils.decode_range(worksheet['!ref']);
const border = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

for (let row = range.s.r; row <= range.e.r; row += 1) {
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
    if (!cell) continue;

    if (row === 0) {
      cell.s = {
        font: { name: 'Aptos', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { patternType: 'solid', fgColor: { rgb: '0F766E' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border,
      };
      continue;
    }

    cell.s = {
      font: { name: 'Aptos', sz: 10, color: { rgb: '0F172A' } },
      fill: { patternType: 'solid', fgColor: { rgb: row % 2 === 0 ? 'F0FDFA' : 'FFFFFF' } },
      alignment: {
        horizontal: [6, 7, 8, 9, 13].includes(column) ? 'right' : 'left',
        vertical: 'center',
        wrapText: [1, 3, 14, 15].includes(column),
      },
      border,
    };

    if ([6, 7, 13].includes(column) && cell.v !== '') cell.z = '#,##0 [$₫-vi-VN]';
    if ([8, 9].includes(column) && cell.v !== '') cell.z = '#,##0';
    if (column === 10) {
      const active = String(cell.v).toLowerCase() === 'active';
      cell.s.font = {
        name: 'Aptos',
        sz: 10,
        bold: true,
        color: { rgb: active ? '047857' : 'B91C1C' },
      };
      cell.s.alignment = { horizontal: 'center', vertical: 'center' };
    }
  }
}

worksheet['!rows'] = Array.from({ length: rows.length + 1 }, (_, index) => ({
  hpt: index === 0 ? 34 : 28,
}));
worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
worksheet['!views'] = [
  { state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' },
];

const workbook = XLSX.utils.book_new();
workbook.Props = {
  Title: 'Danh mục hàng hóa mẫu - 20 dòng',
  Subject: 'File mẫu kiểm thử import sản phẩm MT-GRMS',
  Author: 'MT-GRMS',
  CreatedDate: new Date(),
};
XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhMucHangHoa');

fs.mkdirSync(outputDirectory, { recursive: true });
XLSX.writeFile(workbook, outputPath);
console.log(outputPath);
