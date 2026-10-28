import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import {
  TaxPeriodType,
  TaxCalculationMethod,
  type HouseholdTaxFilterDto,
  type CreateTaxSnapshotRequest,
} from '../types/taxSnapshot';

export function useTaxSnapshots(initialYear: number = 2026) {
  const queryClient = useQueryClient();

  const [filterParams, setFilterParams] = useState<HouseholdTaxFilterDto>({
    year: initialYear,
    periodType: TaxPeriodType.Quarter,
    periodNumber: 3,
    branchId: undefined,
    calculationMethod: TaxCalculationMethod.RevenuePercentage,
    applyVatReduction2026: false,
  });

  // Query Live Summary from Server
  const summaryQuery = useQuery({
    queryKey: ['tax-summary', filterParams],
    queryFn: () => taxSnapshotApi.getTaxSummary(filterParams),
  });

  // Query Historical Snapshots
  const snapshotsQuery = useQuery({
    queryKey: ['tax-snapshots', filterParams.year],
    queryFn: () => taxSnapshotApi.getSnapshots(filterParams.year),
  });

  // Finalize Snapshot Mutation
  const createMutation = useMutation({
    mutationFn: (req: CreateTaxSnapshotRequest) => taxSnapshotApi.createSnapshot(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['tax-summary'] });
    },
  });

  const setCalculationMethod = useCallback((method: TaxCalculationMethod) => {
    setFilterParams((prev) => ({ ...prev, calculationMethod: method }));
  }, []);

  const setPeriod = useCallback((periodType: TaxPeriodType, periodNumber: number) => {
    setFilterParams((prev) => ({ ...prev, periodType, periodNumber }));
  }, []);

  const setYear = useCallback((year: number) => {
    setFilterParams((prev) => ({ ...prev, year }));
  }, []);

  const setApplyVatReduction = useCallback((apply: boolean) => {
    setFilterParams((prev) => ({ ...prev, applyVatReduction2026: apply }));
  }, []);

  return {
    summary: summaryQuery.data,
    isSummaryLoading: summaryQuery.isLoading,
    isSummaryRefetching: summaryQuery.isRefetching,
    summaryError: summaryQuery.error,
    refetchSummary: summaryQuery.refetch,

    snapshots: snapshotsQuery.data || [],
    isSnapshotsLoading: snapshotsQuery.isLoading,
    refetchSnapshots: snapshotsQuery.refetch,

    filterParams,
    setCalculationMethod,
    setPeriod,
    setYear,
    setApplyVatReduction,

    createSnapshot: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
