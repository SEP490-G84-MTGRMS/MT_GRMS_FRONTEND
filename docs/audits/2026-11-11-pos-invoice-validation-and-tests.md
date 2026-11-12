# Rà soát POS, FEFO và quản lý hóa đơn/đơn đặt trước

Ngày: 11/11/2026. Đối chiếu source hiện tại và chạy test; không đo tỷ lệ code coverage.

## Các thay đổi frontend

- Bỏ toàn bộ cột/nút Tùy chọn và popover chiết khấu từng dòng trong giỏ POS; sửa colspan tương ứng.
- Ô ghi chú chỉ hiển thị “Ghi chú đơn hàng”, bỏ ví dụ giao giờ hành chính.
- FEFO gọi `GET /inventory/{productId}/batches?branchId={currentBranchId}`. Chỉ hiển thị sản phẩm đã nạp cho chi nhánh hiện tại; bỏ chi nhánh và tồn/lô mô phỏng. Hủy request khi đổi sản phẩm/chi nhánh, không dùng phản hồi cũ; API lỗi hiện thông báo. Nút thêm hàng sử dụng luồng tự động FEFO, không hứa chọn lô thủ công khi payload tạo đơn chưa hỗ trợ batch ID.
- Bổ sung responsive: header và footer được xuống dòng, ô ghi chú không tràn, modal có giới hạn viewport và cuộn dọc, bảng cuộn ngang trong khung riêng; tên sản phẩm có chiều rộng tối thiểu.
- Tạo đơn đặt trước: bắt buộc chọn khách định danh thật, bỏ customer GUID và danh sách khách mẫu fallback; kiểm tra tên, điện thoại, ngày hẹn tương lai, số lượng/giá/quy đổi hữu hạn hợp lệ, tổng quy đổi không vượt tồn, tiền cọc nguyên không âm nằm trong khoảng tối thiểu 10% và tổng đơn, ghi chú tối đa 500 ký tự. Cọc tối thiểu làm tròn lên theo VND, tránh thấp hơn 10% khi tổng tiền lẻ.
- Giao đơn: kiểm tra tiền còn thu/tiền khách đưa, ghi chú và chặn gửi lặp khi đang xử lý.
- Đổi trả: kiểm tra số lượng hữu hạn, không âm, không vượt dòng gốc, hàng đổi có lượng/giá hợp lệ; ghi chú tối đa 500. Giữ các kiểm tra sẵn có về lý do OTHER, chính sách đơn đặt trước và khả năng hoàn tiền của két.
- Hủy hóa đơn: lý do bắt buộc tối đa 300 ký tự, ghi chú tối đa 500; lỗi API không cập nhật giả sang đã hủy.
- Tạo/giao/đổi trả: lỗi API được trả về popup để popup không đóng và không hiện thành công giả.
- Tìm hóa đơn bằng chữ không còn khớp mọi số điện thoại vì chuỗi chữ bị lọc thành chuỗi số rỗng.
- Shared CollectDebtModal bổ sung số tiền nguyên dương và giới hạn ghi chú. Component này không được mount trong InvoiceManagementPage hiện tại.

## Responsive: phạm vi kiểm chứng

Render các component POS thực bằng Chrome headless và API fixture, kiểm tra 320×740, 375×812, 768×1024, 1024×768, 1366×768, 1920×1080. Màn bán thường được mở thêm ở 375 và 768px; popup FEFO ở 375 và 1366px (request ghi nhận đúng branchId). Kết quả và ảnh nằm trong `responsive-results.json` và `screenshots/`.

Các mẫu đã kiểm tra không tràn ngang toàn tài liệu; bảng giỏ hàng cuộn ngang riêng, thanh thanh toán xuống dưới trên tablet/điện thoại, popup danh mục nằm trong viewport. Có fixture sản phẩm tên dài trong giỏ. Đây không phải xác nhận cho mọi thiết bị, mọi zoom, bàn phím ảo hay toàn bộ popup với dữ liệu thật. Cần kiểm thử thiết bị thật trước nghiệm thu mobile đầy đủ.

## Validation chưa thể kết luận đầy đủ toàn hệ thống

| Phần | Kết quả và giới hạn |
|---|---|
| Tạo đơn đặt trước | Frontend đã bổ sung các kiểm tra liệt kê trên; backend có guard nghiệp vụ cho giỏ, khách, kho, cọc. Chưa thấy validator riêng và bộ test biên đầy đủ cho PreOrderCreateRequest. |
| Giao đơn VietQR | FulfillPreOrderModal còn dùng URL QR với tài khoản hardcode và xác nhận giao bằng thao tác người dùng. Kiểm tra số tiền ở UI không chứng minh đã nhận chuyển khoản đúng tài khoản. |
| Hủy/giao/đổi trả | Đã bỏ cập nhật thành công giả khi API lỗi; vẫn cần integration test rollback và gửi lại request. |
| Tồn kho | UI dùng API thật đúng branch; 3 test frontend chứng minh tham số, race khi đổi branch và lỗi không fallback. Cần integration test RLS/branch trên API/repository thật. |
| Phân quyền | Kiểm tra frontend chỉ phục vụ UX; cần test endpoint thật cho nhân viên gọi trực tiếp chi nhánh/tenant khác. |
| Tiền cọc → chốt ca/EOD | Có rủi ro đã tìm thấy: pending preorder gắn ca được cộng DepositAmount; owner preorder không ca đang PendingPickup bị bỏ qua trong EOD (chỉ lấy Completed). Khi hoàn tất, phần còn lại có thể được ghi két rồi EOD cộng toàn FinalAmount. Chưa sửa luồng kế toán backend trong lượt rà soát này. |

## Unit test backend đã chạy

Chạy bộ lọc bốn class: **68/68 PASS**, 0 fail, 0 skip, kết quả gốc `test-results/pos-audit.trx`.

| Class | Test case thực thi | Phạm vi chính |
|---|---:|---|
| PosOrderServiceTests | 55 | Cash/VietQR, giỏ rỗng/thiếu tiền, FEFO/thiếu kho, nợ/quyền, loyalty/voucher, tạo/giao/hủy preorder, quà tặng, quy đổi đơn vị/giá chi nhánh, trả đổi, kho đồng thời và catalog chi nhánh. |
| PosDbSyncOwnerShiftlessAndBranchCatalogTests | 6 | Owner không ca/kết toán, eligibility ca, attendance, catalog nhiều sản phẩm, login branch claim. Có test liên quan lân cận POS ngoài riêng màn hóa đơn. |
| PosPrintAndPreOrderUnitsTests | 5 | In bill, nhãn thu ngân, logic scope và FEFO minh họa. |
| InventoryTests | 2 | Service tổng hợp tồn và lấy lô của sản phẩm qua fake repository. |

Lần chạy đầu không build được vì API đang giữ DLL; lần chạy thành công dùng OutDir riêng, không tắt API. Có cảnh báo nullability có sẵn. Đây là số test thực thi, không phải 68 requirement hay tỷ lệ bao phủ code.

**Giới hạn của test đang xanh:** `REQ_POS_MULTI_BRANCH_01_RoleScoping_OwnerCanSwitchAndCancel_EmployeeScoped` chỉ kiểm tra biến role/danh sách cục bộ; `REQ_POS_FEFO_02_FefoLotAllocation_And_ManualOverride` chỉ sort dữ liệu và chọn chuỗi trong test. Chúng không gọi controller/service thực để chứng minh phân quyền hay khả năng chọn lô của hệ thống.

## Case unit test còn thiếu hoặc chưa thấy bằng chứng đầy đủ

“Chưa thấy” dưới đây là kết quả rà test source hiện tại, không suy ra chỉ từ tên test. Ưu tiên test gọi service/validator thật và assert side effect/repository.

| Ưu tiên | Case cần bổ sung | Kết quả mong đợi cần assert |
|---|---|---|
| P0 | Preorder cọc tiền mặt/QR ở ca A, đóng ca A, giao ở ca B | Mỗi khoản tiền vào đúng ca đúng lần; số liệu ca đã đóng không thay đổi do đổi status đơn; không cộng toàn đơn cộng thêm phần còn lại. |
| P0 | Owner tạo preorder không ca, cọc hôm nay, giao ngày sau, EOD trước/sau giao | Cọc và phần còn lại được ghi nhận riêng đúng ngày/tài khoản; chạy EOD lại không cộng trùng. |
| P0 | Đổi phương thức thu khi giao (cọc CASH/giao QR và ngược lại) | Giữ nguyên lịch sử phương thức của cọc; phân bổ tiền mặt/ngân hàng không bị ghi lại theo phương thức mới của toàn đơn. |
| P0 | Giao/hủy cùng đơn hai lần hoặc đồng thời | Không thu/hoàn tiền, tăng kho, redeem/rollback voucher hoặc loyalty hai lần; trạng thái và response nhất quán. |
| P0 | Khách/sản phẩm/đơn/chi nhánh thuộc tenant khác; nhân viên gọi API ngoài branch | Bị từ chối và không thay đổi kho, công nợ, tiền hay điểm. Test endpoint/RLS là integration bổ sung. |
| P1 | Preorder giỏ null/rỗng/chỉ quà; customer GUID rỗng/không tồn tại; branch không tồn tại | Lỗi rõ ràng trước khi giữ kho; không để lại order/stock mutation. Test retail rỗng/chỉ quà không thay thế preorder. |
| P1 | Cọc âm/0/dưới 10%/đúng 10%/đúng 100%/vượt tổng; tổng sau KM có tiền lẻ; đơn giá/số lượng/quy đổi 0/âm | Bao phủ biên, tổng sau KM và quy đổi, assert không mutation khi fail. Test hiện có dưới 10% chưa thay thế tất cả biên. |
| P1 | Ngày hẹn rỗng/sai định dạng/quá khứ; note/reason rỗng hoặc quá giới hạn; PaymentMethod không hợp lệ | Validator/service áp dụng cùng rule với giao diện và trả lỗi xác định. |
| P1 | Fulfill đơn không tồn tại, đã hủy/đã giao; trả thiếu/âm; số tiền dư | Chặn trạng thái và số tiền sai, không đổi status/loyalty/shift/cashbook. Case thành công hiện tại không bao phủ nhánh lỗi. |
| P1 | Trả vượt số mua, dòng không thuộc hóa đơn, trả lặp từng phần tới giới hạn | Chặn hoàn vượt giá trị và tăng kho quá mức; phân biệt cùng product nhưng một dòng mua và một dòng quà. |
| P1 | Đổi hàng thiếu tiền/thiếu kho và lỗi giữa transaction | Rollback toàn bộ hàng trả, hàng đổi, tiền, công nợ và trạng thái đơn. |
| P1 | Hủy preorder có quà sau khi chỉ giữ được một phần quà | Chỉ hoàn lượng thực giữ; không nhân đôi stock/usage; cọc được xử lý theo chính sách nghiệp vụ. |
| P1 | OrderCreateRequestValidator từng field âm/rỗng, đơn vị không thuộc product, discount vượt giá trị | Test trực tiếp validator và service; bộ rule retail hiện tại chưa chứng minh mọi field được bảo vệ trên preorder/return/fulfill. |
| P2 | Phân trang/tìm kiếm/filter branch-status-method, in đơn nhiều dòng/quà/tên dài | Đúng dữ liệu, tổng/đếm, không rò dữ liệu branch; report/in bill không cộng giá quà vào tiền phải trả. |

## Test frontend bổ sung

`src/features/pos/__tests__/posInventoryBranchScope.test.tsx`: **3/3 PASS**. Không thay thế integration test backend hoặc kiểm thử thiết bị thật.

`npm run build`: PASS (TypeScript + Vite), còn cảnh báo chunk lớn. Log: `frontend-build.log`. `git diff --check` trên các file chỉnh trong lượt này: PASS.

## Danh sách test backend thực thi

Danh sách bên dưới trích trực tiếp file TRX của lần chạy thành công.

### InventoryTests

- `MT_GRMS.UnitTests.InventoryTests.GetPagedStockSummaryAsync_ShouldReturnCorrectKpisAndItems`
- `MT_GRMS.UnitTests.InventoryTests.GetProductBatchesAsync_ShouldReturnBatchesForProduct`

### PosDbSyncOwnerShiftlessAndBranchCatalogTests

- `MT_GRMS.UnitTests.PosDbSyncOwnerShiftlessAndBranchCatalogTests.CheckCashierShiftEligibility_WithStringUserIdAndAllTime235959Schedule_AllowsAndOpenShiftStoresEmployeeName`
- `MT_GRMS.UnitTests.PosDbSyncOwnerShiftlessAndBranchCatalogTests.CreateOrderAsync_StoreOwnerShiftless_BypassesClosingShiftAndRoutesCashToSafeWithoutTouchingTillOrParticipants`
- `MT_GRMS.UnitTests.PosDbSyncOwnerShiftlessAndBranchCatalogTests.GetBranchProductsAsync_SupportsPageSizeAbove100ForPosCatalog`
- `MT_GRMS.UnitTests.PosDbSyncOwnerShiftlessAndBranchCatalogTests.LoginAsync_ReturnsEmployeeBranchIdAndEmbedsBranchIdClaimInJwt`
- `MT_GRMS.UnitTests.PosDbSyncOwnerShiftlessAndBranchCatalogTests.ResolveDeterministicGuid_ForStringUserIds_ReturnsDistinctDeterministicNonEmptyGuids`
- `MT_GRMS.UnitTests.PosDbSyncOwnerShiftlessAndBranchCatalogTests.SelfCheckInAsync_EnforcesOwnershipIdempotencyAndFaceDescriptorGuard`

### PosOrderServiceTests

- `MT_GRMS.UnitTests.PosOrderServiceTests.CancelOrderAsync_PendingPreOrder_RestoresStockOnHand`
- `MT_GRMS.UnitTests.PosOrderServiceTests.CreateOrderAsync_WithCashierName_PersistsSnapshotAndReturnsInResponse`
- `MT_GRMS.UnitTests.PosOrderServiceTests.CreateOrderAsync_WithLoyaltyPointsRedemption_DeductsPointsAndEarnsNewPoints`
- `MT_GRMS.UnitTests.PosOrderServiceTests.CreateOrderAsync_WithVoucherCode_InvokesAtomicRedemption`
- `MT_GRMS.UnitTests.PosOrderServiceTests.CreatePreOrderAsync_ValidRequest_ReservesStockAndReturnsPendingPickup`
- `MT_GRMS.UnitTests.PosOrderServiceTests.CreatePreOrderAsync_WithCashierName_PersistsCashierNameAndReturnsInResponse`
- `MT_GRMS.UnitTests.PosOrderServiceTests.FulfillPreOrderAsync_ValidPayment_CompletesOrderAndAwardsPoints`
- `MT_GRMS.UnitTests.PosOrderServiceTests.FulfillPreOrderAsync_WithCashierName_RecordsFulfilledByCashierName`
- `MT_GRMS.UnitTests.PosOrderServiceTests.GetOrderSummaryAsync_CalculatesCorrectMetrics`
- `MT_GRMS.UnitTests.PosOrderServiceTests.GetOrdersAsync_ReturnsPersistedCashierName_WithoutOverwriting`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_BRANCH_SCOPE_02_CreateOrder_GiftItemNotInBranch_OmittedWithWarning`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_BRANCH_SCOPE_02_CreateOrder_ProductInactiveInBranch_ThrowsProductNotInBranch`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_BRANCH_SCOPE_02_CreateOrder_ProductNotInBranch_ThrowsProductNotInBranchAndDoesNotDeductStock`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_BRANCH_SCOPE_02_CreatePreOrder_ProductNotInBranch_ThrowsProductNotInBranch`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_BRANCH_SCOPE_02_ProcessReturnExchange_NewItems_NotInBranch_ThrowsProductNotInBranchAndRollsBack`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_FE16_RedeemRewardPoints_DeductsPointsAndEarnsNewPoints`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_FIX_PREUNIT_02_CancelPreOrder_RestoresBaseQuantityUsingConversionRate`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_FIX_PREUNIT_02_CreatePreOrder_AggregatedBaseQuantityExceedingStock_ThrowsInvalidOperationException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_FIX_PREUNIT_02_CreatePreOrder_WithConversionRate_DeductsFEFOBaseStockAndStoresUnitInfo`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_ORD_BOGO_02_CreateOrder_SameProductBuyAndGift_LowStockPrioritizesPaidAndWarns_AndRejectsAllGiftOrder`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_ORD_BOGO_02_CreateOrder_WithGiftItem_DeductsFefoStockAndPersistsZeroPriceLine`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_ORD_BOGO_03_ProcessReturnExchange_ReturningGiftItemSameProduct_ForcesZeroRefundAndRestocks`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_ORD_PRE_01_CreatePreOrder_AutoPromoReducesMinDepositAndReservesGift_AndRejectsVoucherCode`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_ORD_PROMO_01_02_CreateAndCancelOrder_PersistsPromoAuditAndSyncsUsageAndVoucher`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_01_CreateOrder_CashUnderpaid_ThrowsInvalidOperationException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_01_CreateOrder_Cash_Success_ComputesChangeAmount`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_01_CreateOrder_EmptyCart_ThrowsValidationException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_01_CreateOrder_VietQr_Success_StatusPaid`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_02_CreateOrder_FefoInventoryDeduction_Success`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_02_CreateOrder_InsufficientStock_ThrowsInvalidOperationException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_04_ThermalPrintService_BuildEscPosReceipt_GeneratesValid43mmMiniSupermarketStream`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_05_CreateOrder_DebtBlockedCustomer_ThrowsInvalidOperationException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_05_CreateOrder_DebtByCashier_ThrowsUnauthorizedAccessException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_05_CreateOrder_DebtByStoreOwner_Success`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_05_CreateOrder_DebtWithoutLimit_Succeeds`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_05_CreateOrder_Debt_Success_IncrementsCustomerDebt`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_06_CreateOrder_EarnsRewardPoints_ForCustomer`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_06_CreateOrder_WalkInCustomer_DoesNotEarnRewardPoints`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_06_CreateOrder_WhenLoyaltyDisabled_DoesNotEarnRewardPoints`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_09_CreateOrder_BranchProduct_NoOverride_FallsBackToMasterPrice`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_09_CreateOrder_BranchProduct_PriceOverride_AppliesBranchPrice`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_10_CreateOrder_MultiUnit_BranchProductUnitPrice_Override_AppliesOverride`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_11_CancelOrder_RestoresBranchStock`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_11_CreateOrder_MultiUnit_DeductsBaseQuantity_FromBranchStocks_FEFO`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_11_CreateOrder_MultiUnit_InsufficientTotalBaseStock_ThrowsException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_PRE_03_CreatePreOrder_DepositBelow10Percent_ThrowsInvalidOperationException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_PRE_04_CreatePreOrderAsync_MultiBatchFEFO_AllocatesFromEarliestExpiryDateFirst`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_RET_01_ProcessReturnExchange_HigherValue_CustomerPaysDifference`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_RET_01_ProcessReturnExchange_InsufficientStock_ThrowsInvalidOperationException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_RET_01_ProcessReturnExchange_ReduceDebt_Succeeds`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_RET_02_Damaged_Condition_Does_Not_Restock`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_POS_SEC_02_CancelOrder_CashierRole_ThrowsUnauthorizedAccessException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_SHIFT_SHARED_02_CreateOrder_AutoLinksToOpenShift_AndRecordsParticipant`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_SHIFT_SHARED_03_CreateOrder_WhenShiftIsClosing_ThrowsShiftClosingLockdownException`
- `MT_GRMS.UnitTests.PosOrderServiceTests.REQ_STOCK_CONCURRENCY_01_ConcurrentOrders_DeductInventoryWithoutNegativeStock`

### PosPrintAndPreOrderUnitsTests

- `MT_GRMS.UnitTests.PosPrintAndPreOrderUnitsTests.REQ_POS_FEFO_02_FefoLotAllocation_And_ManualOverride`
- `MT_GRMS.UnitTests.PosPrintAndPreOrderUnitsTests.REQ_POS_MULTI_BRANCH_01_RoleScoping_OwnerCanSwitchAndCancel_EmployeeScoped`
- `MT_GRMS.UnitTests.PosPrintAndPreOrderUnitsTests.REQ_POS_PRINT_01_ThermalPrintService_DynamicCashier_OwnerAndStaff_Labels`
- `MT_GRMS.UnitTests.PosPrintAndPreOrderUnitsTests.REQ_POS_PRINT_01_ThermalPrintService_TwoLineLayout_NoRowClash_Valid40Chars`
- `MT_GRMS.UnitTests.PosPrintAndPreOrderUnitsTests.REQ_POS_PRINT_02_ThermalPrintService_MatchesImageForm_4WordsPerLine`
