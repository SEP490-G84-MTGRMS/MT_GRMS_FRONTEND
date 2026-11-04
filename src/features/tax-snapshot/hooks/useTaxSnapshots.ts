import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import {
  TaxPeriodType,
  TaxCalculationMethod,
  type HouseholdTaxFilterDto,
  type CreateTaxSnapshotRequest,
} from '../types/taxSnapshot';

const STORAGE_KEY = 'mt_grms_tax_rate_config';

interface StoredTaxRates {
  customVatRate?: number | null;
  customPitRate?: number | null;
  vatReductionPercentage?: number | null;
  applyVatReduction2026?: boolean;
}

const loadStoredTaxRates = (): StoredTaxRates => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStoredTaxRates = (rates: StoredTaxRates) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
  } catch {
    // Ignore storage quota errors
  }
};

const clearStoredTaxRates = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
};

export function useTaxSnapshots(initialYear: number = 2026) {
  const queryClient = useQueryClient();
  const storedRates = loadStoredTaxRates();

  const [filterParams, setFilterParams] = useState<HouseholdTaxFilterDto>({
    year: initialYear,
    periodType: TaxPeriodType.Quarter,
    periodNumber: 1,
    branchId: undefined,
    calculationMethod: TaxCalculationMethod.RevenuePercentage,
    applyVatReduction2026: storedRates.applyVatReduction2026 ?? false,
    customVatRate: storedRates.customVatRate,
    customPitRate: storedRates.customPitRate,
    vatReductionPercentage: storedRates.vatReductionPercentage,
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
    setFilterParams((prev) => {
      const next = { ...prev, applyVatReduction2026: apply };
      saveStoredTaxRates({
        customVatRate: next.customVatRate,
        customPitRate: next.customPitRate,
        vatReductionPercentage: next.vatReductionPercentage,
        applyVatReduction2026: apply,
      });
      return next;
    });
  }, []);

  const setCustomVatRate = useCallback((rate?: number) => {
    setFilterParams((prev) => {
      const next = { ...prev, customVatRate: rate };
      saveStoredTaxRates({
        customVatRate: rate,
        customPitRate: next.customPitRate,
        vatReductionPercentage: next.vatReductionPercentage,
        applyVatReduction2026: next.applyVatReduction2026,
      });
      return next;
    });
  }, []);

  const setCustomPitRate = useCallback((rate?: number) => {
    setFilterParams((prev) => {
      const next = { ...prev, customPitRate: rate };
      saveStoredTaxRates({
        customVatRate: next.customVatRate,
        customPitRate: rate,
        vatReductionPercentage: next.vatReductionPercentage,
        applyVatReduction2026: next.applyVatReduction2026,
      });
      return next;
    });
  }, []);

  const setVatReductionPercentage = useCallback((pct?: number) => {
    setFilterParams((prev) => {
      const next = { ...prev, vatReductionPercentage: pct };
      saveStoredTaxRates({
        customVatRate: next.customVatRate,
        customPitRate: next.customPitRate,
        vatReductionPercentage: pct,
        applyVatReduction2026: next.applyVatReduction2026,
      });
      return next;
    });
  }, []);

  const updateTaxRates = useCallback(
    (rates: {
      customVatRate?: number | null;
      customPitRate?: number | null;
      vatReductionPercentage?: number | null;
      applyVatReduction2026?: boolean;
    }) => {
      saveStoredTaxRates(rates);
      setFilterParams((prev) => ({
        ...prev,
        ...rates,
      }));
    },
    []
  );

  const resetTaxRatesToDefault = useCallback(() => {
    clearStoredTaxRates();
    setFilterParams((prev) => ({
      ...prev,
      customVatRate: undefined,
      customPitRate: undefined,
      vatReductionPercentage: undefined,
      applyVatReduction2026: false,
    }));
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
    setCustomVatRate,
    setCustomPitRate,
    setVatReductionPercentage,
    updateTaxRates,
    resetTaxRatesToDefault,

    createSnapshot: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
