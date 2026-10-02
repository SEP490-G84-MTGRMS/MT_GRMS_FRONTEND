# Script tạo nhanh file Worklog tóm tắt cho Frontend (MT_GRMS_FRONTEND)
# Cách dùng:
#   powershell -File .\scripts\New-Worklog.ps1 -Feature "FE-01" -Author "Tam" -Desc "product-table"

param(
    [string]$Feature = "FE-TASK",
    [string]$Author = $env:USERNAME,
    [string]$Desc = "ui-update"
)

$today = Get-Date -Format "yyyy-MM-dd"
$safeDesc = $Desc.ToLower() -replace '[^a-z0-9\-]', '-'
$fileName = "${today}_${Feature}_${Author}_${safeDesc}.md"
$worklogDir = Join-Path $PSScriptRoot "..\docs\worklogs"
$targetPath = Join-Path $worklogDir $fileName

$branch = "unknown"
try {
    $branch = (git branch --show-current 2>$null).Trim()
    if (-not $branch) { $branch = "feat/$Feature" }
} catch {
    $branch = "feat/$Feature"
}

if (-not (Test-Path $worklogDir)) {
    New-Item -ItemType Directory -Path $worklogDir -Force | Out-Null
}

if (Test-Path $targetPath) {
    Write-Host "[THÔNG BÁO] File worklog đã tồn tại: $targetPath" -ForegroundColor Yellow
    exit 0
}

$template = @"
# WORKLOG: [$Feature] - $Desc

- **Ngày thực hiện**: $today
- **Người thực hiện**: $Author
- **Nhánh Git (Branch)**: `$branch`
- **Mã tính năng liên kết**: [$Feature](../../../DOCS_MT_GRMS/specs/$Feature/spec.md)
- **Loại thay đổi**: Feature / Bugfix / Refactor / UI-UX

---

### 1. Mục Đích Thay Đổi (Why)
- [Mô tả ngắn gọn 1-2 câu giải thích lý do thay đổi và màn hình/component được bổ sung]

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/components/...`: [Mô tả chi tiết component đã thêm/sửa]
- `src/pages/...`: [Mô tả trang đã thêm/sửa]
- `src/services/...`: [Mô tả API client đã thêm/sửa]
- `src/types/...`: [Mô tả interface/type đã thêm/sửa]

### 3. Chi Tiết UI/UX & API Integration
- **Đường dẫn Route (URL)**: `/...`
- **API Endpoint Backend tương ứng**: `[GET / POST] /api/v1/...`
- **Breaking Changes**: [Không có hoặc mô tả cụ thể]

### 4. Kiểm Thử & Xác Nhận (Verification)
- [ ] Đã chạy `npm run build`: Thành công (0 lỗi TypeScript).
- [ ] Đã kiểm tra trực tiếp giao diện trên trình duyệt (Responsive & UX mượt mà).

---

### 5. Chỉ Dẫn Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro (Risk Level)**: Thấp (Low) / Trung bình (Medium) / Cao (High)
- **File cần Manager review kỹ nhất**: `[Tên file và lý do]`
- **Hướng dẫn Manager test nhanh UI**:
  - Đăng nhập bằng quyền: [Admin / Store Owner / Staff]
  - Truy cập URL: `http://localhost:5173/...`
  - Thao tác kiểm tra: [Nhấn nút X, nhập thông tin Y...]
"@

Set-Content -Path $targetPath -Value $template -Encoding UTF8
Write-Host "[THÀNH CÔNG] Đã tạo file worklog tại:" -ForegroundColor Green
Write-Host "  $targetPath" -ForegroundColor Cyan
Write-Host "Vui lòng cập nhật nội dung và git add cùng với code!" -ForegroundColor Yellow
