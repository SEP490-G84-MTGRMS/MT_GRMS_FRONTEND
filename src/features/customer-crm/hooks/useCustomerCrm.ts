import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import type {
  CustomerDto,
  CreateCustomerInput,
  UpdateCustomerInput,
  CollectDebtInput,
  DebtFilterStatus,
} from '../types/customer.types';

export const CUSTOMERS_QUERY_KEY = ['customers'];
export const CUSTOMER_KPIS_QUERY_KEY = ['customer-kpis'];

/**
 * Hook to manage Customer CRM state and TanStack Query mutations
 */
export function useCustomerCrm() {
  const queryClient = useQueryClient();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedDebtStatus, setSelectedDebtStatus] = useState<DebtFilterStatus>('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleTierChange = (tier: string) => {
    setSelectedTier(tier);
    setCurrentPage(1);
  };

  const handleDebtStatusChange = (status: DebtFilterStatus) => {
    setSelectedDebtStatus(status);
    setCurrentPage(1);
  };

  // Drawer and Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);
  const [collectingCustomer, setCollectingCustomer] = useState<CustomerDto | null>(null);

  // Query customers
  const {
    data: customers = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, searchTerm, selectedTier, selectedDebtStatus],
    queryFn: () =>
      customerApi.getCustomers({
        search: searchTerm,
        tier: selectedTier,
        debtStatus: selectedDebtStatus,
      }),
  });

  // Query KPI summary
  const { data: kpiSummary, isLoading: isKpiLoading } = useQuery({
    queryKey: CUSTOMER_KPIS_QUERY_KEY,
    queryFn: () => customerApi.getKpiSummary(),
  });

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateCustomerInput) => customerApi.createCustomer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KPIS_QUERY_KEY });
      setIsFormModalOpen(false);
    },
  });

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerInput }) =>
      customerApi.updateCustomer(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KPIS_QUERY_KEY });
      if (selectedCustomer?.id === updated.id) {
        setSelectedCustomer(updated);
      }
      setIsFormModalOpen(false);
      setEditingCustomer(null);
    },
  });

  // Collect debt mutation
  const collectDebtMutation = useMutation({
    mutationFn: (input: CollectDebtInput) => customerApi.collectDebt(input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KPIS_QUERY_KEY });
      if (selectedCustomer?.id === updated.id) {
        setSelectedCustomer(updated);
      }
      setCollectingCustomer(null);
    },
  });

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (customer: CustomerDto) => {
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };

  const handleOpenCollectModal = (customer: CustomerDto) => {
    setCollectingCustomer(customer);
  };

  const handleSelectCustomer = (customer: CustomerDto) => {
    setSelectedCustomer(customer);
  };

  const handleCloseDrawer = () => {
    setSelectedCustomer(null);
  };

  return {
    // Data
    customers,
    kpiSummary,
    isLoading: isLoading || isFetching,
    isKpiLoading,
    error,
    refetch,

    // Filters
    searchTerm,
    setSearchTerm: handleSearchChange,
    selectedTier,
    setSelectedTier: handleTierChange,
    selectedDebtStatus,
    setSelectedDebtStatus: handleDebtStatusChange,

    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,

    // Modals & Drawer
    selectedCustomer,
    isFormModalOpen,
    setIsFormModalOpen,
    editingCustomer,
    collectingCustomer,
    setCollectingCustomer,

    // Actions
    handleOpenCreateModal,
    handleOpenEditModal,
    handleOpenCollectModal,
    handleSelectCustomer,
    handleCloseDrawer,

    // Mutations
    createMutation,
    updateMutation,
    collectDebtMutation,
  };
}