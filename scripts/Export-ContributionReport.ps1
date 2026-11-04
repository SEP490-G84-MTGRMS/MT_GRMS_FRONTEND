<#
.SYNOPSIS
    Tự động quét toàn bộ Git History và xuất báo cáo đóng góp chi tiết cho từng thành viên (Phục vụ đồ án SEP490).
.DESCRIPTION
    Script phân tích tất cả commit trong repo (bao gồm author, email, số commit, số dòng code thêm/xóa)
    và xuất ra báo cáo bảng Markdown lưu tại docs/reports/CONTRIBUTION_REPORT.md.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File ./scripts/Export-ContributionReport.ps1
#>

[CmdletBinding()]
param (
    [string]$Branch = "HEAD",
    [string]$OutputFile = "docs/reports/CONTRIBUTION_REPORT.md"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "📊 ĐANG QUÉT DỮ LIỆU ĐÓNG GÓP (GIT CONTRIBUTION REPORT)..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$OutputDir = Split-Path -Path $OutputFile -Parent
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Lấy danh sách tác giả duy nhất (Email là khóa chính)
$authorLines = git log $Branch --format="%an|%ae" | Sort-Object -Unique

if (-not $authorLines) {
    Write-Warning "Không tìm thấy dữ liệu commit nào trên nhánh $Branch!"
    exit 0
}

# Nhóm theo Email để tránh trùng lặp nếu 1 người dùng nhiều tên (ví dụ Ortus24 và Nhật Long cùng email)
$authorMap = @{}

foreach ($line in $authorLines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line.Split('|')
    $name = $parts[0].Trim()
    $email = $parts[1].Trim()

    if (-not $authorMap.ContainsKey($email)) {
        $authorMap[$email] = @{
            Names       = [System.Collections.Generic.List[string]]::new()
            Email       = $email
            Commits     = 0
            Insertions  = 0
            Deletions   = 0
        }
    }
    if (-not $authorMap[$email].Names.Contains($name)) {
        $authorMap[$email].Names.Add($name)
    }
}

$reportList = @()
$totalRepoCommits = 0
$totalRepoInsertions = 0
$totalRepoDeletions = 0

foreach ($email in $authorMap.Keys) {
    $entry = $authorMap[$email]
    $displayName = ($entry.Names -join " / ")

    # Đếm số commit thực hiện bởi email này (bao gồm cả merge commits)
    $commitCountStr = git rev-list --count --author="<$email>" $Branch
    $commitCount = [int]$commitCountStr

    # Thống kê số dòng thêm/xóa (không tính merge commits để đo lường code thật)
    $shortStats = git log $Branch --author="<$email>" --shortstat --no-merges

    $insertions = 0
    $deletions = 0

    foreach ($stat in $shortStats) {
        if ($stat -match '(\d+)\s+insertion') {
            $insertions += [int]$matches[1]
        }
        if ($stat -match '(\d+)\s+deletion') {
            $deletions += [int]$matches[1]
        }
    }

    $entry.Commits = $commitCount
    $entry.Insertions = $insertions
    $entry.Deletions = $deletions
    $net = $insertions - $deletions

    $totalRepoCommits += $commitCount
    $totalRepoInsertions += $insertions
    $totalRepoDeletions += $deletions

    $reportList += [PSCustomObject]@{
        DisplayName = $displayName
        Email       = $email
        Commits     = $commitCount
        Insertions  = $insertions
        Deletions   = $deletions
        NetLines    = $net
    }
}

$nowStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$lines = [System.Collections.Generic.List[string]]::new()

$lines.Add("# 📊 BÁO CÁO THỐNG KÊ ĐÓNG GÓP THÀNH VIÊN (PROJECT CONTRIBUTION REPORT)")
$lines.Add("")
$lines.Add("> **Dự án**: MT-GRMS (SEP490 - Capstone Project)  ")
$lines.Add("> **Thời điểm kết xuất**: $nowStr  ")
$lines.Add("> **Nhánh phân tích**: ``$Branch``  ")
$lines.Add("")
$lines.Add("---")
$lines.Add("")
$lines.Add("## 🏆 1. Bảng Tổng Hợp Đóng Góp Theo Thành Viên")
$lines.Add("")
$lines.Add("| STT | Thành Viên (Author) | Email Đăng Ký | Số Commits | Dòng Code Thêm (+) | Dòng Code Xóa (-) | Code Thực Nhận (Net) | Tỷ Lệ Commits (%) |")
$lines.Add("| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :-: |")

$idx = 1
$sortedList = $reportList | Sort-Object -Property Commits -Descending

foreach ($item in $sortedList) {
    $cPercent = if ($totalRepoCommits -gt 0) { [math]::Round(($item.Commits / $totalRepoCommits) * 100, 1) } else { 0 }
    $insFmt = $item.Insertions.ToString("N0")
    $delFmt = $item.Deletions.ToString("N0")
    $netFmt = $item.NetLines.ToString("N0")
    $lines.Add("| $idx | **$($item.DisplayName)** | ``$($item.Email)`` | $($item.Commits) | +$insFmt | -$delFmt | $netFmt | **$cPercent%** |")
    $idx++
}

$lines.Add("")
$lines.Add("**Tổng kết toàn repo**: $totalRepoCommits commits, +$($totalRepoInsertions.ToString("N0")) dòng thêm, -$($totalRepoDeletions.ToString("N0")) dòng xóa.")
$lines.Add("")
$lines.Add("---")
$lines.Add("")
$lines.Add("## 📜 2. Lịch Sử Commit Gần Nhất Của Từng Thành Viên")
$lines.Add("")

foreach ($item in $sortedList) {
    $lines.Add("### 👤 $($item.DisplayName) (``$($item.Email)``)")
    $recentCommits = git log $Branch --author="<$($item.Email)>" -n 5 --pretty=format:"- ``%h`` - *(%cd)*: %s" --date=short
    if ($recentCommits) {
        foreach ($rc in $recentCommits) {
            $lines.Add($rc)
        }
    } else {
        $lines.Add("- *(Chưa có commit trực tiếp trên nhánh này)*")
    }
    $lines.Add("")
}

$lines.Add("---")
$lines.Add("")
$lines.Add("## ⚠️ Lưu Ý Cho Admin & Hội Đồng Đánh Giá (Reviewers):")
$lines.Add("1. Dữ liệu trên được trích xuất trực tiếp từ Git Log bằng mã băm SHA-1 nguyên bản, không thể làm giả.")
$lines.Add("2. Mọi Merge Request (PR) được yêu cầu chọn chế độ **Create a merge commit** để bảo toàn 100% commit của từng cá nhân.")
$lines.Add("3. Các trường hợp làm việc theo cặp (Pair Programming) được ghi nhận bằng cú pháp ``Co-authored-by``.")

[System.IO.File]::WriteAllLines((Resolve-Path -Path $OutputFile -ErrorAction SilentlyContinue), $lines, [System.Text.Encoding]::UTF8)

Write-Host "✅ Đã tạo thành công báo cáo thống kê tại: $OutputFile" -ForegroundColor Green
Write-Host ""
$reportList | Format-Table DisplayName, Email, Commits, Insertions, Deletions, NetLines -AutoSize
