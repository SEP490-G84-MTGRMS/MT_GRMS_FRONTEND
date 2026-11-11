import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, Trash2, Search, ChevronDown, X, Check, Building2, AlertTriangle, RotateCw, Plus } from 'lucide-react';
import type {
  Employee,
  Branch,
  AllowanceItem,
  SalaryType,
} from '../types';
import { CreateUserModal } from './CreateUserModal';
import { CreateAllowanceModal } from './CreateAllowanceModal';
import { employeeApi } from '../api/employeeApi';
import { mapFormToCreatePayload } from '../lib/employeeMapper';
import { extractDescriptorFromImage } from '../lib/faceIdService';
import {
  getVietnamToday,
  getVietnamTodayIso,
  normalizeVietnameseComparison,
} from '../lib/vietnamTime';
import { uploadImageToCloudinary } from '../../../utils/cloudinary';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSave: (employee: Employee, isAddNew?: boolean) => void;
  branches: Branch[];
  existingEmployees?: Employee[];
}

const PREDEFINED_BANKS = [
  { value: 'Techcombank', label: 'Techcombank (TCB)' },
  { value: 'Vietcombank', label: 'Vietcombank (VCB)' },
  { value: 'MB Bank', label: 'MB Bank (MB)' },
  { value: 'BIDV', label: 'BIDV' },
  { value: 'VietinBank', label: 'VietinBank (CTG)' },
  { value: 'Agribank', label: 'Agribank' },
  { value: 'ACB', label: 'ACB' },
  { value: 'VPBank', label: 'VPBank' },
  { value: 'TPBank', label: 'TPBank' },
  { value: 'Sacombank', label: 'Sacombank' },
  { value: 'HDBank', label: 'HDBank' },
  { value: 'VIB', label: 'VIB' },
  { value: 'SHB', label: 'SHB' },
  { value: 'MSB', label: 'MSB' },
  { value: 'OCB', label: 'OCB' },
  { value: 'SeABank', label: 'SeABank' },
];

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSave,
  branches,
  existingEmployees = [],
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'salary'>('info');

  // Sub-modals
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateAllowance, setShowCreateAllowance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states - Tab 1: Thông tin
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [faceDescriptor, setFaceDescriptor] = useState<string | null>(null);
  const [faceImageUrls, setFaceImageUrls] = useState<string[]>([]);
  const [faceDescriptorsList, setFaceDescriptorsList] = useState<number[][]>([]);
  const [faceScanStatus, setFaceScanStatus] = useState<'idle' | 'scanning' | 'success' | 'warning'>('idle');
  const [faceScanMessage, setFaceScanMessage] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const trainingInputRef = useRef<HTMLInputElement>(null);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [citizenId, setCitizenId] = useState('');
  const [address, setAddress] = useState('');

  // Work info
  const [startDate, setStartDate] = useState('');
  const [workingBranchId, setWorkingBranchId] = useState<string>('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [note, setNote] = useState('');

  // Bank info
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankSelect, setBankSelect] = useState('Techcombank');
  const [customBankName, setCustomBankName] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  // Tab 2: Lương
  const [salaryType, setSalaryType] = useState<SalaryType>('monthly');
  const [baseSalary, setBaseSalary] = useState<number | ''>('');
  const [otWeekday, setOtWeekday] = useState('');
  const [otSunday, setOtSunday] = useState('');
  const [otDayOff, setOtDayOff] = useState('');
  const [otHoliday, setOtHoliday] = useState('300%');
  const [enableAllowance, setEnableAllowance] = useState(false);
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);

  // Sync when opening or editing
  useEffect(() => {
    if (employee) {
      setFullName(employee.fullName || '');
      setEmployeeCode(employee.employeeCode || '');
      setPhone(employee.phone || '');
      setEmail(employee.email || '');
      setAvatarUrl(employee.avatarUrl || '');
      setFaceDescriptor(employee.faceDescriptor || null);

      // Parse danh sách ảnh mẫu FaceImageUrls
      let initialImages: string[] = [];
      if (employee.faceImageUrls) {
        try {
          if (Array.isArray(employee.faceImageUrls)) {
            initialImages = employee.faceImageUrls;
          } else if (typeof employee.faceImageUrls === 'string') {
            if (employee.faceImageUrls.startsWith('[')) {
              initialImages = JSON.parse(employee.faceImageUrls);
            } else {
              initialImages = [employee.faceImageUrls];
            }
          }
        } catch {
          initialImages = [];
        }
      }
      if (initialImages.length === 0 && employee.avatarUrl) {
        initialImages = [employee.avatarUrl];
      }
      setFaceImageUrls(initialImages);

      // Parse danh sách vector FaceDescriptors (hỗ trợ cả mảng 1D [128] và 2D [[128], [128]])
      let initialDescriptors: number[][] = [];
      if (employee.faceDescriptor) {
        try {
          const parsed = JSON.parse(employee.faceDescriptor);
          if (Array.isArray(parsed)) {
            if (parsed.length > 0 && Array.isArray(parsed[0])) {
              initialDescriptors = parsed as number[][];
            } else if (parsed.length === 128 && typeof parsed[0] === 'number') {
              initialDescriptors = [parsed as number[]];
            }
          }
        } catch {
          initialDescriptors = [];
        }
      }
      setFaceDescriptorsList(initialDescriptors);

      if (initialDescriptors.length > 0) {
        setFaceScanStatus('success');
        setFaceScanMessage(`Đã kích hoạt FaceID (${initialDescriptors.length} mẫu khuôn mặt)`);
      } else {
        setFaceScanStatus('idle');
        setFaceScanMessage(null);
      }

      setGender(employee.gender || 'male');
      setDateOfBirth(employee.dateOfBirth || '');
      setCitizenId(employee.citizenId || '');
      setAddress(employee.address || '');

      setStartDate(employee.startDate || '');
      const initBranchId =
        employee.salaryBranchId ||
        (employee.workingBranchIds && employee.workingBranchIds[0]) ||
        (branches[0]?.id || '');
      setWorkingBranchId(initBranchId);
      setUserId(employee.userId || '');
      setUserName(employee.userName || '');
      setNote(employee.note || '');

      setBankAccountNumber(employee.bankAccountNumber || '');
      const empBank = employee.bankName || '';
      if (empBank && PREDEFINED_BANKS.some((b) => b.value === empBank)) {
        setBankSelect(empBank);
        setCustomBankName('');
      } else if (empBank) {
        setBankSelect('OTHER');
        setCustomBankName(empBank);
      } else {
        setBankSelect('Techcombank');
        setCustomBankName('');
      }
      setBankAccountHolder(employee.bankAccountHolder || '');

      if (employee.salaryConfig) {
        setSalaryType(employee.salaryConfig.salaryType);
        setBaseSalary(employee.salaryConfig.baseSalary ?? '');
        setOtWeekday(employee.salaryConfig.otWeekday || '');
        setOtSunday(employee.salaryConfig.otSunday || '');
        setOtDayOff(employee.salaryConfig.otDayOff || '');
        setOtHoliday(employee.salaryConfig.otHoliday);
        const empAllowances = employee.salaryConfig.allowances || [];
        setAllowances(empAllowances);
        setEnableAllowance(empAllowances.length > 0);
      }
    } else {
      // Default reset for creation
      setFullName('');
      setEmployeeCode('');
      setPhone('');
      setEmail('');
      setAvatarUrl('');
      setFaceDescriptor(null);
      setFaceImageUrls([]);
      setFaceDescriptorsList([]);
      setFaceScanStatus('idle');
      setFaceScanMessage(null);
      setGender('male');
      setDateOfBirth('');
      setCitizenId('');
      setAddress('');

      setStartDate(getVietnamTodayIso());
      setWorkingBranchId(branches[0]?.id || '');
      setUserId('');
      setUserName('');
      setNote('');

      setBankAccountNumber('');
      setBankSelect('Techcombank');
      setCustomBankName('');
      setBankAccountHolder('');

      setSalaryType('monthly');
      setBaseSalary('');
      setOtWeekday('');
      setOtSunday('');
      setOtDayOff('');
      setAllowances([]);
      setEnableAllowance(false);
    }
    setFormError(null);
    setIsSubmitting(false);
    setTouched({});
    setHasSubmitted(false);
  }, [employee, branches, isOpen]);

  // Inline validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Real-time Inline Errors
  const fullNameError = useMemo(() => {
    const trimmed = fullName.trim();
    if (!trimmed) return 'Họ và tên nhân viên không được để trống.';
    if (trimmed.length < 2) return 'Họ và tên phải từ 2 đến 100 ký tự.';
    if (fullName.length > 100) return 'Họ và tên không vượt quá 100 ký tự.';
    if (!/^[\p{L}\s'.\-]+$/u.test(trimmed)) {
      return 'Họ và tên không được chứa chữ số hoặc ký tự đặc biệt.';
    }
    return null;
  }, [fullName]);

  const phoneError = useMemo(() => {
    const trimmed = phone.trim().replace(/^\+84/, '0');
    if (!trimmed) return 'Số điện thoại không được để trống.';
    if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(trimmed)) {
      return 'Số điện thoại không đúng định dạng Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08, 09).';
    }
    return null;
  }, [phone]);

  const duplicateNameWarning = useMemo(() => {
    const normalizedInput = normalizeVietnameseComparison(fullName);
    if (!normalizedInput || normalizedInput.length < 2 || existingEmployees.length === 0) return null;
    const matched = existingEmployees.find(
      (emp) =>
        emp.id !== employee?.id &&
        normalizeVietnameseComparison(emp.fullName) === normalizedInput
    );
    if (matched) {
      return `Lưu ý: Tên nhân viên trùng (hoặc tương đương không dấu/hoa-thường) với "${matched.fullName}" (${matched.employeeCode}).`;
    }
    return null;
  }, [fullName, existingEmployees, employee?.id]);

  const dateOfBirthAndStartDateError = useMemo(() => {
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (!isNaN(dob.getTime())) {
        const vnToday = getVietnamToday();
        const minAgeDate = new Date(vnToday.getFullYear() - 15, vnToday.getMonth(), vnToday.getDate());
        const maxAgeDate = new Date(vnToday.getFullYear() - 75, vnToday.getMonth(), vnToday.getDate());
        if (dob > minAgeDate || dob < maxAgeDate) {
          return 'Nhân viên phải đủ từ 15 tuổi đến 75 tuổi theo quy định lao động (tính theo múi giờ UTC+7).';
        }
        if (startDate) {
          const start = new Date(startDate);
          const minWorkDate = new Date(dob.getFullYear() + 15, dob.getMonth(), dob.getDate());
          if (!isNaN(start.getTime()) && start < minWorkDate) {
            return 'Ngày bắt đầu làm việc không hợp lệ so với ngày sinh (phải đủ 15 tuổi).';
          }
        }
      }
    }
    return null;
  }, [dateOfBirth, startDate]);

  const allowancesError = useMemo(() => {
    if (!enableAllowance || allowances.length === 0) return null;
    const enabledList = allowances.filter((a) => a.enabled);
    const seenNames = new Map<string, string>();
    for (const item of enabledList) {
      const trimmedName = (item.name || '').trim();
      if (!trimmedName) {
        return 'Tên khoản phụ cấp không được để trống.';
      }
      if (trimmedName.length > 100) {
        return 'Tên khoản phụ cấp không vượt quá 100 ký tự.';
      }
      const normalizedName = normalizeVietnameseComparison(trimmedName);
      if (seenNames.has(normalizedName)) {
        const existingOriginal = seenNames.get(normalizedName);
        return `Tên khoản phụ cấp "${trimmedName}" bị trùng lặp với "${existingOriginal}" (so sánh không phân biệt dấu tiếng Việt và chữ HOA/thường).`;
      }
      seenNames.set(normalizedName, trimmedName);
      const amountNum = Number(item.amount) || 0;
      if (amountNum < 0 || amountNum > 500000000) {
        return 'Mức phụ cấp phải nằm trong khoảng từ 0 đến 500.000.000 đ.';
      }
    }
    return null;
  }, [enableAllowance, allowances]);

  const citizenIdError = useMemo(() => {
    const trimmed = citizenId.trim();
    if (!trimmed) return 'Số CMND / CCCD không được để trống.';
    if (!/^(00[1-9]|0[1-8][0-9]|09[0-6])[0-9]{9}$/.test(trimmed)) {
      return 'Số CCCD phải gồm đúng 12 chữ số hợp lệ (3 số đầu thuộc mã tỉnh/thành 001–096).';
    }
    return null;
  }, [citizenId]);

  const employeeCodeError = useMemo(() => {
    const trimmed = employeeCode.trim();
    if (!trimmed) return null; // Để trống tự sinh
    if (trimmed.length > 30) return 'Mã nhân viên không vượt quá 30 ký tự.';
    if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      return 'Mã nhân viên chỉ gồm chữ cái không dấu, số, gạch ngang/dưới và tối đa 30 ký tự.';
    }
    return null;
  }, [employeeCode]);

  const emailError = useMemo(() => {
    const trimmed = email.trim();
    if (!trimmed) return null;
    if (trimmed.length > 100) return 'Email không vượt quá 100 ký tự.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'Địa chỉ email không đúng định dạng (Ví dụ: nguyenvana@gmail.com hoặc nhanvien@mtmart.vn).';
    }
    return null;
  }, [email]);

  const baseSalaryError = useMemo(() => {
    if (baseSalary === '' || baseSalary === undefined) return null;
    const num = Number(baseSalary);
    if (isNaN(num) || num < 0) return 'Mức lương cơ bản không được âm.';
    if (num > 1000000000) return 'Mức lương cơ bản không được vượt quá 1.000.000.000 đ.';
    return null;
  }, [baseSalary]);

  const noteError = useMemo(() => {
    if (note && note.length > 500) return 'Ghi chú không vượt quá 500 ký tự.';
    return null;
  }, [note]);

  const addressError = useMemo(() => {
    if (address && address.length > 255) return 'Địa chỉ không vượt quá 255 ký tự.';
    return null;
  }, [address]);

  const bankAccountNumberError = useMemo(() => {
    const trimmed = bankAccountNumber.trim();
    if (!trimmed) return null;
    if (trimmed.length > 30) return 'Số tài khoản ngân hàng không vượt quá 30 ký tự.';
    if (/[^\x00-\x7F]/.test(trimmed)) {
      return 'Số tài khoản ngân hàng chỉ được nhập chữ cái tiếng Việt không dấu (A-Z) và chữ số (0-9), không được nhập chữ có dấu.';
    }
    if (/\s/.test(trimmed)) {
      return 'Số tài khoản ngân hàng phải viết liền không khoảng trắng (chỉ gồm chữ cái không dấu A-Z và chữ số 0-9).';
    }
    if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
      return 'Số tài khoản ngân hàng không hợp lệ: chỉ gồm chữ cái không dấu (A-Z) và chữ số (0-9), không chứa ký tự đặc biệt (Ví dụ: 19036688999012).';
    }
    return null;
  }, [bankAccountNumber]);

  const bankAccountHolderError = useMemo(() => {
    if (bankAccountHolder && bankAccountHolder.length > 100) {
      return 'Chủ tài khoản ngân hàng không vượt quá 100 ký tự.';
    }
    return null;
  }, [bankAccountHolder]);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearchKeyword, setBranchSearchKeyword] = useState('');
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown chi nhánh khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBranchDropdownOpen(false);
      }
    };

    if (isBranchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBranchDropdownOpen]);

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(branchSearchKeyword.trim().toLowerCase())
  );

  const handleSelectBranch = (branchId: string) => {
    setWorkingBranchId(branchId);
    setIsBranchDropdownOpen(false);
    setBranchSearchKeyword('');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Kích thước ảnh đại diện không được vượt quá 5MB.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setFormError(null);
      setFaceScanStatus('scanning');
      setFaceScanMessage('Đang tải ảnh và trích xuất vector khuôn mặt...');
      const secureUrl = await uploadImageToCloudinary(file, 'mtgrms/employees');
      setAvatarUrl(secureUrl);

      // Tự động trích xuất vector FaceID từ ảnh đại diện
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = secureUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const descriptor = await extractDescriptorFromImage(img);
        if (descriptor && descriptor.length === 128) {
          // Thêm/cập nhật ảnh đại diện vào vị trí đầu tiên của danh sách huấn luyện đa ảnh
          const remainingUrls = faceImageUrls.filter((u) => u !== secureUrl);
          const newUrls = [secureUrl, ...remainingUrls].slice(0, 4);
          const newDescriptors = [descriptor, ...faceDescriptorsList.slice(1)].slice(0, 4);

          setFaceImageUrls(newUrls);
          setFaceDescriptorsList(newDescriptors);
          const jsonDesc = JSON.stringify(newDescriptors);
          setFaceDescriptor(jsonDesc);
          setFaceScanStatus('success');
          setFaceScanMessage(`Đã nhận diện FaceID thành công (${newDescriptors.length} mẫu khuôn mặt).`);
        } else {
          setFaceScanStatus('warning');
          setFaceScanMessage('Không phát hiện khuôn mặt rõ ràng trong ảnh đại diện. Vui lòng chọn ảnh chụp thẳng, rõ nét.');
        }
      } catch (scanErr) {
        console.warn('Lỗi trích xuất khuôn mặt từ avatar:', scanErr);
        setFaceScanStatus('warning');
        setFaceScanMessage('Không thể trích xuất FaceID từ ảnh này.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Không thể tải ảnh đại diện lên Cloudinary. Vui lòng thử lại.');
      setFaceScanStatus('idle');
      setFaceScanMessage(null);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleTrainingImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (faceImageUrls.length >= 4) {
      setFormError('Hệ thống chỉ hỗ trợ tối đa 4 ảnh mẫu huấn luyện FaceID.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Kích thước ảnh không được vượt quá 5MB.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setFormError(null);
      setFaceScanStatus('scanning');
      setFaceScanMessage('Đang tải ảnh mẫu và trích xuất vector khuôn mặt...');
      const secureUrl = await uploadImageToCloudinary(file, 'mtgrms/employees');

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = secureUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const descriptor = await extractDescriptorFromImage(img);
        if (descriptor && descriptor.length === 128) {
          const newUrls = [...faceImageUrls, secureUrl].slice(0, 4);
          const newDescriptors = [...faceDescriptorsList, descriptor].slice(0, 4);
          if (!avatarUrl) {
            setAvatarUrl(secureUrl);
          }
          setFaceImageUrls(newUrls);
          setFaceDescriptorsList(newDescriptors);
          setFaceDescriptor(JSON.stringify(newDescriptors));
          setFaceScanStatus('success');
          setFaceScanMessage(`Đã thêm mẫu FaceID thành công (${newDescriptors.length}/4 mẫu).`);
        } else {
          setFormError('Không phát hiện khuôn mặt rõ nét trong ảnh mẫu này. Vui lòng chọn góc mặt rõ ràng hơn.');
          setFaceScanStatus('warning');
          setFaceScanMessage('Ảnh mẫu không nhận diện được khuôn mặt.');
        }
      } catch (scanErr) {
        console.warn('Lỗi trích xuất khuôn mặt từ ảnh mẫu:', scanErr);
        setFormError('Không thể trích xuất đặc trưng khuôn mặt từ ảnh này.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Không thể tải ảnh mẫu lên Cloudinary.');
    } finally {
      setIsUploadingAvatar(false);
      if (trainingInputRef.current) {
        trainingInputRef.current.value = '';
      }
    }
  };

  const handleRemoveTrainingImage = (index: number) => {
    const removedUrl = faceImageUrls[index];
    const newUrls = faceImageUrls.filter((_, i) => i !== index);
    const newDescriptors = faceDescriptorsList.filter((_, i) => i !== index);

    setFaceImageUrls(newUrls);
    setFaceDescriptorsList(newDescriptors);

    if (avatarUrl === removedUrl) {
      setAvatarUrl(newUrls.length > 0 ? newUrls[0] : '');
    }

    if (newDescriptors.length > 0) {
      setFaceDescriptor(JSON.stringify(newDescriptors));
      setFaceScanStatus('success');
      setFaceScanMessage(`Còn lại ${newDescriptors.length} mẫu khuôn mặt FaceID`);
    } else {
      setFaceDescriptor(null);
      setFaceScanStatus('idle');
      setFaceScanMessage(null);
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (faceImageUrls.length > 1) {
      handleRemoveTrainingImage(0);
    } else {
      setAvatarUrl('');
      setFaceDescriptor(null);
      setFaceImageUrls([]);
      setFaceDescriptorsList([]);
      setFaceScanStatus('idle');
      setFaceScanMessage(null);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleAllowanceNameChange = (id: string, name: string) => {
    setAllowances(
      allowances.map((item) => (item.id === id ? { ...item, name } : item))
    );
  };

  const handleAllowanceAmountChange = (id: string, amount: number) => {
    setAllowances(
      allowances.map((item) => (item.id === id ? { ...item, amount } : item))
    );
  };

  const handleAllowanceToggle = (id: string) => {
    setAllowances(
      allowances.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleDeleteAllowance = (id: string) => {
    setAllowances(allowances.filter((item) => item.id !== id));
  };

  const handleAddAllowanceRow = () => {
    setEnableAllowance(true);
    const newAl: AllowanceItem = {
      id: `al_${Date.now()}`,
      name: '',
      type: 'monthly',
      amount: 0,
      enabled: true,
    };
    setAllowances((prev) => [...prev, newAl]);
  };

  const totalAllowances = enableAllowance
    ? allowances
      .filter((a) => a.enabled)
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
    : 0;

  const handleAddAllowanceSuccess = (newAl: AllowanceItem) => {
    setAllowances([...allowances, newAl]);
  };

  const handleCreateUserSuccess = (user: { id: string; username: string; password?: string }) => {
    setUserId(user.id);
    setUserName(user.username);
    if (user.password) {
      setUserPassword(user.password);
    }
  };

  const handleSave = async (isAddNew: boolean = false) => {
    setHasSubmitted(true);
    setFormError(null);

    if (isUploadingAvatar) {
      setFormError('Ảnh đại diện đang được tải lên Cloudinary, vui lòng chờ trong giây lát!');
      return;
    }

    if (fullNameError) {
      setFormError(fullNameError);
      setActiveTab('info');
      return;
    }

    if (phoneError) {
      setFormError(phoneError);
      setActiveTab('info');
      return;
    }

    if (citizenIdError) {
      setFormError(citizenIdError);
      setActiveTab('info');
      return;
    }

    if (employeeCodeError) {
      setFormError(employeeCodeError);
      setActiveTab('info');
      return;
    }

    if (emailError) {
      setFormError(emailError);
      setActiveTab('info');
      return;
    }

    if (addressError) {
      setFormError(addressError);
      setActiveTab('info');
      return;
    }

    if (noteError) {
      setFormError(noteError);
      setActiveTab('info');
      return;
    }

    if (bankAccountNumberError) {
      setFormError(bankAccountNumberError);
      setActiveTab('info');
      return;
    }

    if (bankAccountHolderError) {
      setFormError(bankAccountHolderError);
      setActiveTab('info');
      return;
    }

    if (bankSelect === 'OTHER' && !customBankName.trim()) {
      setFormError('Vui lòng nhập tên ngân hàng khác!');
      setActiveTab('info');
      return;
    }

    if (dateOfBirthAndStartDateError) {
      setFormError(dateOfBirthAndStartDateError);
      setActiveTab('info');
      return;
    }

    if (baseSalaryError) {
      setFormError(baseSalaryError);
      setActiveTab('salary');
      return;
    }

    if (allowancesError) {
      setFormError(allowancesError);
      setActiveTab('salary');
      return;
    }

    const effectiveBankName = bankSelect === 'OTHER' ? customBankName.trim() : bankSelect;

    const targetBranchId = workingBranchId || (branches[0] ? branches[0].id : '');
    if (!targetBranchId) {
      setFormError('Vui lòng chọn chi nhánh làm việc!');
      return;
    }

    const effectiveAvatar = avatarUrl || (faceImageUrls.length > 0 ? faceImageUrls[0] : undefined);
    const effectiveFaceDesc = faceDescriptorsList.length > 0
      ? JSON.stringify(faceDescriptorsList)
      : faceDescriptor;
    const effectiveFaceUrls = faceImageUrls.length > 0
      ? JSON.stringify(faceImageUrls)
      : (effectiveAvatar ? JSON.stringify([effectiveAvatar]) : undefined);

    const normalizedPhone = phone.trim().replace(/^\+84/, '0');

    const payload = mapFormToCreatePayload(
      {
        employeeCode: !employee ? employeeCode : undefined,
        fullName: fullName.replace(/\s+/g, ' ').trim(),
        citizenId,
        phone: normalizedPhone,
        email,
        address,
        startDate,
        note,
        gender,
        dateOfBirth,
        bankAccountNumber,
        bankName: effectiveBankName,
        bankAccountHolder,
        avatarUrl: effectiveAvatar,
        faceDescriptor: effectiveFaceDesc,
        faceImageUrls: effectiveFaceUrls,
        salaryBranchId: targetBranchId,
        userId: userId && !userId.startsWith('temp_') ? userId : undefined,
        userName: userName.trim() || undefined,
        password: userPassword.trim() || undefined,
        role: 'STAFF',
      },
      {
        salaryType,
        baseSalary: Number(baseSalary) || 0,
        otWeekday: otWeekday || '150%',
        otSunday: otSunday || '200%',
        otDayOff: otDayOff || '200%',
        otHoliday,
        allowances: enableAllowance ? allowances : [],
      },
      targetBranchId
    );

    setIsSubmitting(true);
    try {
      let savedEmp: Employee;
      if (employee?.id) {
        savedEmp = await employeeApi.updateEmployee(employee.id, payload);
      } else {
        savedEmp = await employeeApi.createEmployee(payload);
        // Failsafe: nếu backend đang chạy phiên bản cũ chưa tự động tạo user trong createEmployee
        if (savedEmp.id && userName && !savedEmp.userName) {
          try {
            const accRes = await employeeApi.createIdentityAccount(savedEmp.id, {
              username: userName.trim(),
              password: userPassword.trim() || 'Staff@123456',
              role: 'STAFF',
              displayName: fullName,
            });
            savedEmp = {
              ...savedEmp,
              userId: accRes.userId,
              userName: accRes.username || userName,
            };
          } catch (accountErr) {
            console.error('Lỗi khi tự động cấp tài khoản cho nhân viên mới:', accountErr);
          }
        }
      }

      onSave(savedEmp, isAddNew);
      if (!isAddNew) {
        onClose();
      } else {
        // Reset for next employee
        setFullName('');
        setEmployeeCode('');
        setPhone('');
        setEmail('');
        setCitizenId('');
        setDateOfBirth('');
        setAvatarUrl('');
        setFaceDescriptor(null);
        setFaceImageUrls([]);
        setFaceDescriptorsList([]);
        setFaceScanStatus('idle');
        setFaceScanMessage(null);
        setUserId('');
        setUserName('');
        setUserPassword('');
        setFormError(null);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Lưu thông tin thất bại. Vui lòng kiểm tra lại.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="emp-modal-overlay">
        <div className="emp-modal-card">
          {/* Header */}
          <div className="emp-modal-header">
            <h3>{employee ? `Cập nhật nhân viên: ${employee.fullName}` : 'Thêm mới nhân viên'}</h3>
            <button
              type="button"
              className="emp-modal-close-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              &times;
            </button>
          </div>

          {formError && (
            <div
              style={{
                margin: '12px 24px 0',
                padding: '10px 14px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                borderRadius: 6,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="emp-modal-tabs">
            <button
              type="button"
              className={`emp-modal-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              Thông tin
            </button>
            <button
              type="button"
              className={`emp-modal-tab-btn ${activeTab === 'salary' ? 'active' : ''}`}
              onClick={() => setActiveTab('salary')}
            >
              Thiết lập lương
            </button>
          </div>

          {/* Body */}
          <div className="emp-modal-body">
            {/* TAB 1: THÔNG TIN */}
            {activeTab === 'info' && (
              <div>
                {/* 1. THÔNG TIN KHỞI TẠO */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin khởi tạo</div>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div className="emp-form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label className="emp-form-label" style={{ marginBottom: 0 }}>
                            Tên nhân viên <span className="required">*</span>
                          </label>
                          <span style={{ fontSize: 11, color: fullName.length > 100 ? '#EF4444' : '#94A3B8' }}>
                            {fullName.length}/100
                          </span>
                        </div>
                        <input
                          type="text"
                          className="emp-form-input"
                          placeholder="Nhập họ và tên đầy đủ"
                          value={fullName}
                          maxLength={100}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            if (!touched.fullName) markTouched('fullName');
                          }}
                          onBlur={() => {
                            setFullName((prev) => prev.replace(/\s+/g, ' ').trim());
                            markTouched('fullName');
                          }}
                          style={{
                            borderColor: (touched.fullName || hasSubmitted) && fullNameError ? '#EF4444' : undefined,
                          }}
                          required
                        />
                        {(touched.fullName || hasSubmitted) && fullNameError && (
                          <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>•</span> {fullNameError}
                          </div>
                        )}
                        {!fullNameError && duplicateNameWarning && (
                          <div style={{ fontSize: 12, color: '#D97706', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                            <span>{duplicateNameWarning}</span>
                          </div>
                        )}
                      </div>

                      <div className="emp-grid-2">
                        <div className="emp-form-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label className="emp-form-label" style={{ marginBottom: 0 }}>
                              Mã nhân viên {employee && <span style={{ fontSize: 11, color: '#64748B' }}>(Cố định)</span>}
                            </label>
                            {!employee && (
                              <span style={{ fontSize: 11, color: employeeCode.length > 30 ? '#EF4444' : '#94A3B8' }}>
                                {employeeCode.length}/30
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            className="emp-form-input"
                            placeholder={employee ? employee.employeeCode : 'Tự sinh nếu bỏ trống (NV000001)'}
                            value={employeeCode}
                            disabled={!!employee}
                            maxLength={30}
                            onChange={(e) => {
                              setEmployeeCode(e.target.value.toUpperCase());
                              if (!touched.employeeCode) markTouched('employeeCode');
                            }}
                            onBlur={() => markTouched('employeeCode')}
                            style={{
                              borderColor: (touched.employeeCode || hasSubmitted) && employeeCodeError ? '#EF4444' : undefined,
                              backgroundColor: employee ? '#F1F5F9' : undefined,
                              cursor: employee ? 'not-allowed' : undefined,
                            }}
                          />
                          {(touched.employeeCode || hasSubmitted) && employeeCodeError && (
                            <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>•</span> {employeeCodeError}
                            </div>
                          )}
                        </div>
                        <div className="emp-form-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label className="emp-form-label" style={{ marginBottom: 0 }}>
                              Số điện thoại <span className="required">*</span>
                            </label>
                            <span style={{ fontSize: 11, color: phone.length > 20 ? '#EF4444' : '#94A3B8' }}>
                              {phone.length}/20
                            </span>
                          </div>
                          <input
                            type="tel"
                            className="emp-form-input"
                            placeholder="03x, 05x, 07x, 08x, 09x..."
                            value={phone}
                            maxLength={20}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              if (!touched.phone) markTouched('phone');
                            }}
                            onBlur={() => {
                              setPhone((prev) => prev.trim().replace(/^\+84/, '0'));
                              markTouched('phone');
                            }}
                            style={{
                              borderColor: (touched.phone || hasSubmitted) && phoneError ? '#EF4444' : undefined,
                            }}
                            required
                          />
                          {(touched.phone || hasSubmitted) && phoneError && (
                            <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>•</span> {phoneError}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="emp-form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label className="emp-form-label" style={{ marginBottom: 0 }}>Email</label>
                          <span style={{ fontSize: 11, color: email.length > 100 ? '#EF4444' : '#94A3B8' }}>
                            {email.length}/100
                          </span>
                        </div>
                        <input
                          type="email"
                          className="emp-form-input"
                          placeholder="Ví dụ: nguyenvana@gmail.com hoặc nhanvien@mtmart.vn"
                          value={email}
                          maxLength={100}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (!touched.email) markTouched('email');
                          }}
                          onBlur={() => markTouched('email')}
                          style={{
                            borderColor: (touched.email || hasSubmitted) && emailError ? '#EF4444' : undefined,
                          }}
                        />
                        {(touched.email || hasSubmitted) && emailError && (
                          <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>•</span> {emailError}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload Avatar & FaceID Multi-image Training */}
                    <div style={{ width: 170, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleAvatarUpload}
                      />
                      <input
                        ref={trainingInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleTrainingImageUpload}
                      />

                      <div
                        className="emp-avatar-upload-box"
                        onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
                        title={avatarUrl ? 'Nhấn để thay đổi ảnh đại diện chính' : 'Nhấn để tải ảnh đại diện lên'}
                      >
                        {isUploadingAvatar ? (
                          <div style={{ textAlign: 'center', padding: 8 }}>
                            <RotateCw size={24} className="spin-icon" color="#0F766E" style={{ margin: '0 auto 6px' }} />
                            <span style={{ fontSize: 11, color: '#0F766E', fontWeight: 600, display: 'block' }}>
                              Đang tải lên...
                            </span>
                          </div>
                        ) : avatarUrl ? (
                          <>
                            <img src={avatarUrl} alt="Avatar" />
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: 'rgba(0, 0, 0, 0.65)',
                                color: '#FFFFFF',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              title="Xóa ảnh đại diện"
                            >
                              <X size={13} />
                            </button>
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'rgba(15, 23, 42, 0.65)',
                                color: '#FFFFFF',
                                fontSize: 10,
                                padding: '3px 0',
                                textAlign: 'center',
                                fontWeight: 600,
                              }}
                            >
                              Đổi ảnh chính
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                              <Camera size={26} color="#94A3B8" />
                            </div>
                            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Tải ảnh đại diện</span>
                          </div>
                        )}
                      </div>
                      <small style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
                        Ảnh đại diện chính
                      </small>

                      {/* FaceID Multi-image Training Gallery */}
                      <div
                        style={{
                          width: '100%',
                          marginTop: 10,
                          padding: '8px 10px',
                          background: '#F8FAFC',
                          borderRadius: 8,
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                            Mẫu FaceID ({faceImageUrls.length}/4)
                          </span>
                          {faceImageUrls.length < 4 && (
                            <button
                              type="button"
                              onClick={() => !isUploadingAvatar && trainingInputRef.current?.click()}
                              style={{
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                borderRadius: 4,
                                color: '#0F766E',
                                fontSize: 10,
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: '2px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                              }}
                              title="Tải thêm ảnh mẫu khuôn mặt khác để nhận diện chuẩn hơn (ngưỡng 65%)"
                            >
                              <Plus size={11} /> Thêm ảnh
                            </button>
                          )}
                        </div>

                        {faceImageUrls.length > 0 ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {faceImageUrls.map((imgUrl, idx) => (
                              <div
                                key={idx}
                                onClick={() => setAvatarUrl(imgUrl)}
                                style={{
                                  position: 'relative',
                                  width: 32,
                                  height: 32,
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  border: imgUrl === avatarUrl ? '2px solid #0F766E' : '1px solid #CBD5E1',
                                  cursor: 'pointer',
                                  background: '#E2E8F0',
                                }}
                                title={`Mẫu ${idx + 1}${imgUrl === avatarUrl ? ' (Đang là avatar chính)' : ' (Bấm để chọn làm avatar)'}`}
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Sample ${idx + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveTrainingImage(idx);
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: 1,
                                    right: 1,
                                    width: 13,
                                    height: 13,
                                    borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.65)',
                                    color: '#FFF',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                  title="Xóa mẫu ảnh này"
                                >
                                  <X size={8} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', padding: '2px 0' }}>
                            Chưa có dữ liệu mẫu
                          </div>
                        )}
                      </div>

                      {faceScanStatus === 'scanning' && (
                        <span style={{ fontSize: 11, color: '#0F766E', marginTop: 6, textAlign: 'center', display: 'block', fontWeight: 600 }}>
                          {faceScanMessage || 'Đang trích xuất FaceID...'}
                        </span>
                      )}
                      {faceScanStatus === 'success' && (
                        <span style={{ fontSize: 11, color: '#059669', marginTop: 6, textAlign: 'center', display: 'block', fontWeight: 600 }}>
                          ✓ {faceScanMessage || 'Đã kích hoạt FaceID'}
                        </span>
                      )}
                      {faceScanStatus === 'warning' && (
                        <span style={{ fontSize: 11, color: '#D97706', marginTop: 6, textAlign: 'center', display: 'block', fontWeight: 500 }} title={faceScanMessage || ''}>
                          ⚠ {faceScanMessage || 'Chưa nhận diện được mặt'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. THÔNG TIN CÔNG VIỆC */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin công việc</div>
                  <div className="emp-form-group">
                    <label className="emp-form-label">Ngày bắt đầu làm việc</label>
                    <input
                      type="date"
                      className="emp-form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  {/* Chi nhánh làm việc - Searchable Single-Select UI */}
                  <div className="emp-form-group" ref={branchDropdownRef} style={{ position: 'relative' }}>
                    <label className="emp-form-label">
                      Chi nhánh làm việc <span className="required">*</span>
                    </label>

                    {/* Selector Trigger Input */}
                    <div
                      onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                      style={{
                        height: 40,
                        padding: '0 12px',
                        border: `1px solid ${hasSubmitted && !workingBranchId ? '#EF4444' : isBranchDropdownOpen ? '#0F766E' : '#CBD5E1'}`,
                        borderRadius: 8,
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        transition: 'all 0.15s ease',
                        boxShadow: isBranchDropdownOpen ? '0 0 0 3px rgba(15, 118, 110, 0.15)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
                        <Building2 size={16} color="#64748B" style={{ flexShrink: 0 }} />

                        {(() => {
                          const currentBranch = branches.find((b) => b.id === workingBranchId);
                          if (!currentBranch) {
                            return <span style={{ color: '#94A3B8', fontSize: 13 }}>Chọn chi nhánh làm việc...</span>;
                          }
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: '#1E293B',
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                }}
                              >
                                {currentBranch.name}
                              </span>
                              {currentBranch.isMain && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: '#E2E8F0',
                                    color: '#475569',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                  }}
                                >
                                  Trụ sở
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', color: '#64748B' }}>
                        <ChevronDown
                          size={16}
                          style={{
                            transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Dropdown Panel */}
                    {isBranchDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: 6,
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 10,
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          zIndex: 1000,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Search Input Bar */}
                        <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '5px 10px',
                            }}
                          >
                            <Search size={14} color="#94A3B8" />
                            <input
                              type="text"
                              value={branchSearchKeyword}
                              onChange={(e) => setBranchSearchKeyword(e.target.value)}
                              placeholder="Tìm kiếm chi nhánh theo tên..."
                              style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                width: '100%',
                                fontSize: 13,
                                color: '#1E293B',
                              }}
                              autoFocus
                            />
                            {branchSearchKeyword && (
                              <button
                                type="button"
                                onClick={() => setBranchSearchKeyword('')}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  color: '#94A3B8',
                                  padding: 0,
                                  display: 'flex',
                                }}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Branches List */}
                        <div style={{ maxHeight: 210, overflowY: 'auto', padding: '4px 0' }}>
                          {filteredBranches.length ? (
                            filteredBranches.map((b) => {
                              const isSelected = workingBranchId === b.id;
                              return (
                                <div
                                  key={b.id}
                                  onClick={() => handleSelectBranch(b.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '9px 14px',
                                    cursor: 'pointer',
                                    background: isSelected ? '#F0FDFA' : 'transparent',
                                    transition: 'background 0.12s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: isSelected ? 600 : 400,
                                        color: isSelected ? '#0F766E' : '#1E293B',
                                      }}
                                    >
                                      {b.name}
                                    </span>
                                    {b.isMain && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          padding: '1px 6px',
                                          borderRadius: 4,
                                          background: '#E2E8F0',
                                          color: '#475569',
                                          fontWeight: 600,
                                        }}
                                      >
                                        Trụ sở
                                      </span>
                                    )}
                                  </div>

                                  {isSelected && <Check size={16} color="#0F766E" />}
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ padding: '16px 12px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                              Không tìm thấy chi nhánh nào phù hợp
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {hasSubmitted && !workingBranchId && (
                      <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>•</span> Chi nhánh làm việc bắt buộc phải được chọn.
                      </div>
                    )}
                  </div>

                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="emp-form-label">Tài khoản đăng nhập</label>
                        {!userName && (
                          <button
                            type="button"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#0F766E',
                              fontWeight: 600,
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                            onClick={() => setShowCreateUser(true)}
                          >
                            + Tạo tài khoản
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Chưa liên kết tài khoản"
                        value={userName || (userId ? `ID: ${userId}` : '')}
                        readOnly
                        onClick={() => setShowCreateUser(true)}
                        style={{
                          backgroundColor: '#F8FAFC',
                          cursor: 'pointer',
                        }}
                        title={userName ? 'Nhấn để cập nhật thông tin tài khoản' : 'Nhấn để tạo tài khoản'}
                      />
                    </div>

                    <div className="emp-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className="emp-form-label" style={{ marginBottom: 0 }}>Ghi chú</label>
                        <span style={{ fontSize: 11, color: note.length > 500 ? '#EF4444' : '#94A3B8' }}>
                          {note.length}/500
                        </span>
                      </div>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Ghi chú nhân sự..."
                        value={note}
                        maxLength={500}
                        onChange={(e) => {
                          setNote(e.target.value);
                          if (!touched.note) markTouched('note');
                        }}
                        onBlur={() => markTouched('note')}
                        style={{
                          borderColor: (touched.note || hasSubmitted) && noteError ? '#EF4444' : undefined,
                        }}
                      />
                      {(touched.note || hasSubmitted) && noteError && (
                        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>•</span> {noteError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. THÔNG TIN NGÂN HÀNG */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin tài khoản ngân hàng</div>
                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className="emp-form-label" style={{ marginBottom: 0 }}>Số tài khoản</label>
                        <span style={{ fontSize: 11, color: bankAccountNumber.length > 30 ? '#EF4444' : '#94A3B8' }}>
                          {bankAccountNumber.length}/30
                        </span>
                      </div>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Chữ không dấu và số, viết liền (VD: 19036688999012)"
                        value={bankAccountNumber}
                        maxLength={30}
                        onChange={(e) => {
                          setBankAccountNumber(e.target.value);
                          if (!touched.bankAccountNumber) markTouched('bankAccountNumber');
                        }}
                        onBlur={() => markTouched('bankAccountNumber')}
                        style={{
                          borderColor: (touched.bankAccountNumber || hasSubmitted) && bankAccountNumberError ? '#EF4444' : undefined,
                        }}
                      />
                      {(touched.bankAccountNumber || hasSubmitted) && bankAccountNumberError && (
                        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>•</span> {bankAccountNumberError}
                        </div>
                      )}
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Ngân hàng</label>
                      <select
                        className="emp-form-select"
                        value={bankSelect}
                        onChange={(e) => setBankSelect(e.target.value)}
                      >
                        {PREDEFINED_BANKS.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                        <option value="OTHER">Ngân hàng khác...</option>
                      </select>
                    </div>
                  </div>

                  {bankSelect === 'OTHER' && (
                    <div className="emp-form-group" style={{ marginTop: 12 }}>
                      <label className="emp-form-label" style={{ color: '#0F766E', fontWeight: 600 }}>
                        Tên ngân hàng khác <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Nhập tên ngân hàng (VD: Shinhan Bank, Woori Bank...)"
                        value={customBankName}
                        onChange={(e) => setCustomBankName(e.target.value)}
                        style={{
                          borderColor: hasSubmitted && !customBankName.trim() ? '#EF4444' : undefined,
                        }}
                        autoFocus
                      />
                      {hasSubmitted && !customBankName.trim() && (
                        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>•</span> Vui lòng nhập tên ngân hàng khác!
                        </div>
                      )}
                    </div>
                  )}

                  <div className="emp-form-group" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="emp-form-label" style={{ marginBottom: 0 }}>Tên chủ tài khoản</label>
                      <span style={{ fontSize: 11, color: bankAccountHolder.length > 100 ? '#EF4444' : '#94A3B8' }}>
                        {bankAccountHolder.length}/100
                      </span>
                    </div>
                    <input
                      type="text"
                      className="emp-form-input"
                      placeholder="VD: NGUYEN VAN A (Tự in hoa)"
                      value={bankAccountHolder}
                      maxLength={100}
                      onChange={(e) => {
                        setBankAccountHolder(e.target.value.toUpperCase());
                        if (!touched.bankAccountHolder) markTouched('bankAccountHolder');
                      }}
                      onBlur={() => markTouched('bankAccountHolder')}
                      style={{
                        borderColor: (touched.bankAccountHolder || hasSubmitted) && bankAccountHolderError ? '#EF4444' : undefined,
                      }}
                    />
                    {(touched.bankAccountHolder || hasSubmitted) && bankAccountHolderError && (
                      <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>•</span> {bankAccountHolderError}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. THÔNG TIN CÁ NHÂN */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin cá nhân</div>
                  <div className="emp-grid-3">
                    <div className="emp-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className="emp-form-label" style={{ marginBottom: 0 }}>
                          Số CMND / CCCD <span className="required">*</span>
                        </label>
                        <span style={{ fontSize: 11, color: citizenId.length !== 12 && citizenId.length > 0 ? '#EF4444' : '#94A3B8' }}>
                          {citizenId.length}/12
                        </span>
                      </div>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Đúng 12 chữ số CCCD"
                        value={citizenId}
                        maxLength={12}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setCitizenId(val);
                          if (!touched.citizenId) markTouched('citizenId');
                        }}
                        onBlur={() => markTouched('citizenId')}
                        style={{
                          borderColor: (touched.citizenId || hasSubmitted) && citizenIdError ? '#EF4444' : undefined,
                        }}
                      />
                      {(touched.citizenId || hasSubmitted) && citizenIdError && (
                        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>•</span> {citizenIdError}
                        </div>
                      )}
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Ngày sinh</label>
                      <input
                        type="date"
                        className="emp-form-input"
                        value={dateOfBirth}
                        onChange={(e) => {
                          setDateOfBirth(e.target.value);
                          if (!touched.dateOfBirth) markTouched('dateOfBirth');
                        }}
                        onBlur={() => markTouched('dateOfBirth')}
                        style={{
                          borderColor: (touched.dateOfBirth || hasSubmitted) && dateOfBirthAndStartDateError ? '#EF4444' : undefined,
                        }}
                      />
                      {(touched.dateOfBirth || hasSubmitted) && dateOfBirthAndStartDateError && (
                        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>•</span> {dateOfBirthAndStartDateError}
                        </div>
                      )}
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Giới tính</label>
                      <div style={{ display: 'flex', gap: 16, height: 40, alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <input
                            type="radio"
                            name="gender"
                            checked={gender === 'male'}
                            onChange={() => setGender('male')}
                            style={{ accentColor: '#0F766E' }}
                          />
                          <span>Nam</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <input
                            type="radio"
                            name="gender"
                            checked={gender === 'female'}
                            onChange={() => setGender('female')}
                            style={{ accentColor: '#0F766E' }}
                          />
                          <span>Nữ</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="emp-form-group" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="emp-form-label" style={{ marginBottom: 0 }}>Địa chỉ</label>
                      <span style={{ fontSize: 11, color: address.length > 255 ? '#EF4444' : '#94A3B8' }}>
                        {address.length}/255
                      </span>
                    </div>
                    <input
                      type="text"
                      className="emp-form-input"
                      placeholder="Số nhà, đường phố, phường/xã, quận/huyện, tỉnh/thành..."
                      value={address}
                      maxLength={255}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (!touched.address) markTouched('address');
                      }}
                      onBlur={() => markTouched('address')}
                      style={{
                        borderColor: (touched.address || hasSubmitted) && addressError ? '#EF4444' : undefined,
                      }}
                    />
                    {(touched.address || hasSubmitted) && addressError && (
                      <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>•</span> {addressError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: THIẾT LẬP LƯƠNG */}
            {activeTab === 'salary' && (
              <div>
                <div className="emp-section-card">
                  <div className="emp-section-title">Hình thức & Mức lương chính</div>
                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Hình thức trả lương</label>
                      <select
                        className="emp-form-select"
                        value={salaryType}
                        onChange={(e) => setSalaryType(e.target.value as SalaryType)}
                      >
                        <option value="monthly">Lương cố định theo tháng</option>
                        <option value="hourly">Lương theo giờ làm việc</option>
                        <option value="shift">Lương theo ca làm việc</option>
                      </select>
                    </div>

                    <div className="emp-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className="emp-form-label" style={{ marginBottom: 0 }}>
                          {salaryType === 'monthly'
                            ? 'Mức lương chính (VNĐ/tháng)'
                            : salaryType === 'hourly'
                              ? 'Mức lương chính (VNĐ/giờ)'
                              : 'Mức lương chính (VNĐ/ca)'}
                        </label>
                        {baseSalary !== '' && !isNaN(Number(baseSalary)) && (
                          <span style={{ fontSize: 11, color: '#0F766E', fontWeight: 600 }}>
                            {Number(baseSalary).toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        step="50000"
                        min="0"
                        max="1000000000"
                        className="emp-form-input"
                        placeholder={
                          salaryType === 'monthly'
                            ? 'VD: 7,500,000'
                            : salaryType === 'hourly'
                              ? 'VD: 30,000'
                              : 'VD: 250,000'
                        }
                        value={baseSalary === '' ? '' : baseSalary}
                        onChange={(e) => {
                          setBaseSalary(e.target.value === '' ? '' : Number(e.target.value));
                          if (!touched.baseSalary) markTouched('baseSalary');
                        }}
                        onBlur={() => markTouched('baseSalary')}
                        style={{
                          borderColor: (touched.baseSalary || hasSubmitted) && baseSalaryError ? '#EF4444' : undefined,
                        }}
                      />
                      {(touched.baseSalary || hasSubmitted) && baseSalaryError && (
                        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>•</span> {baseSalaryError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* OT Config */}
                <div className="emp-section-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div className="emp-section-title" style={{ marginBottom: 2 }}>Hệ số làm thêm giờ (OT)</div>
                    </div>
                  </div>

                  <div className="emp-grid-2">
                    {/* Tăng ca ngày thường */}
                    <div className="emp-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="emp-form-label" style={{ marginBottom: 0 }}>Ngày thường</label>
                        {otWeekday && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#0F766E' }}>
                            x{((parseInt(otWeekday.replace('%', '')) || 0) / 100).toFixed(1)} lương/giờ
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          min={100}
                          max={500}
                          step={10}
                          className="emp-form-input"
                          style={{ paddingRight: 36, fontWeight: 600 }}
                          value={otWeekday ? otWeekday.replace('%', '') : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setOtWeekday(val ? `${val}%` : '');
                          }}
                          placeholder="150"
                        />
                        <span style={{ position: 'absolute', right: 12, color: '#64748B', fontWeight: 600, pointerEvents: 'none' }}>
                          %
                        </span>
                      </div>
                    </div>

                    {/* Tăng ca Chủ nhật / Ngày nghỉ */}
                    <div className="emp-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="emp-form-label" style={{ marginBottom: 0 }}>Chủ nhật / Nghỉ tuần</label>
                        {otSunday && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#0F766E' }}>
                            x{((parseInt(otSunday.replace('%', '')) || 0) / 100).toFixed(1)} lương/giờ
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          min={100}
                          max={500}
                          step={10}
                          className="emp-form-input"
                          style={{ paddingRight: 36, fontWeight: 600 }}
                          value={otSunday ? otSunday.replace('%', '') : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setOtSunday(val ? `${val}%` : '');
                            setOtDayOff(val ? `${val}%` : '');
                          }}
                          placeholder="200"
                        />
                        <span style={{ position: 'absolute', right: 12, color: '#64748B', fontWeight: 600, pointerEvents: 'none' }}>
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phụ cấp */}
                <div className="emp-section-card">
                  <div className="emp-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>Phụ cấp lương</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400 }}>
                        <input
                          type="checkbox"
                          checked={enableAllowance}
                          onChange={(e) => setEnableAllowance(e.target.checked)}
                          style={{ accentColor: '#0F766E' }}
                        />
                        <span>Áp dụng phụ cấp</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      style={{
                        background: '#F0FDFA',
                        border: '1px solid #99F6E4',
                        color: '#0F766E',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                      onClick={handleAddAllowanceRow}
                    >
                      + Thêm khoản phụ cấp
                    </button>
                  </div>

                  {enableAllowance && (
                    <>
                      <table className="emp-table" style={{ border: '1px solid #E2E8F0', borderRadius: 8, marginTop: 8 }}>
                        <thead>
                          <tr>
                            <th style={{ width: 44, textAlign: 'center' }}>Bật</th>
                            <th>Tên khoản phụ cấp</th>
                            <th style={{ width: 220 }}>Số tiền (VNĐ)</th>
                            <th style={{ width: 44, textAlign: 'center' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {allowances.length > 0 ? (
                            allowances.map((al) => (
                              <tr key={al.id}>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={al.enabled}
                                    onChange={() => handleAllowanceToggle(al.id)}
                                    style={{ accentColor: '#0F766E' }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="emp-form-input"
                                    style={{ height: 32 }}
                                    placeholder="Tên khoản phụ cấp (VD: Ăn trưa, xăng xe, trách nhiệm...)"
                                    value={al.name}
                                    onChange={(e) => handleAllowanceNameChange(al.id, e.target.value)}
                                    disabled={!al.enabled}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="emp-form-input"
                                    style={{ height: 32 }}
                                    step="10000"
                                    min="0"
                                    placeholder="Số tiền (VD: 500,000)"
                                    value={!al.amount ? '' : al.amount}
                                    onChange={(e) =>
                                      handleAllowanceAmountChange(
                                        al.id,
                                        e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                                      )
                                    }
                                    disabled={!al.enabled}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#EF4444',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: 4,
                                    }}
                                    onClick={() => handleDeleteAllowance(al.id)}
                                    title="Xóa phụ cấp này"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>
                                Chưa có khoản phụ cấp nào. Bấm "+ Thêm khoản phụ cấp" để tạo mới.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {allowancesError && (
                        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>•</span> {allowancesError}
                        </div>
                      )}

                      {/* Total Allowance Summary */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: 12,
                          marginTop: 10,
                          padding: '8px 14px',
                          background: '#F8FAFC',
                          borderRadius: 6,
                          border: '1px solid #E2E8F0',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#334155',
                        }}
                      >
                        <span>Tổng phụ cấp đang áp dụng:</span>
                        <span style={{ color: '#0F766E', fontSize: 15, fontWeight: 700 }}>
                          {totalAllowances.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="emp-modal-footer">
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting || isUploadingAvatar}
            >
              Bỏ qua
            </button>
            {!employee && (
              <button
                type="button"
                className="emp-btn emp-btn-outline-teal"
                onClick={() => handleSave(true)}
                disabled={isSubmitting || isUploadingAvatar}
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu & Thêm mới'}
              </button>
            )}
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              onClick={() => handleSave(false)}
              disabled={isSubmitting || isUploadingAvatar}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <CreateUserModal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        employeeId={employee?.id}
        employeeName={employee?.fullName || fullName}
        employeeCode={employee?.employeeCode}
        phone={phone}
        initialUsername={userName}
        branchName={branches.find((b) => b.id === workingBranchId)?.name}
        deferSave={true}
        onSuccess={handleCreateUserSuccess}
      />
      <CreateAllowanceModal
        isOpen={showCreateAllowance}
        onClose={() => setShowCreateAllowance(false)}
        existingAllowances={allowances}
        onSuccess={handleAddAllowanceSuccess}
      />
    </>
  );
};
