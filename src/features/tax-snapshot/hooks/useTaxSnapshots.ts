import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import type {
  TaxSnapshotFilterParams,
  TaxSnapshotStatus,
} from '../types/taxSnapshot';

export function useTaxSnapshots(initialYear: number = new Date().getFullYear()) {
  const queryClient = useQueryClient();

  const [filterParams, setFilterParams] = useState<TaxSnapshotFilterParams>({
    year: initialYear,
    quarter: undefined,
    status: 'ALL',
    keyword: '',
  });

  // Queries
  const snapshotsQuery = useQuery({
    queryKey: ['tax-snapshots', filterParams],
    queryFn: () => taxSnapshotApi.getSnapshots(filterParams),
  });

  const kpisQuery = useQuery({
    queryKey: ['tax-kpis', filterParams.year || initialYear],
    queryFn: () => taxSnapshotApi.getKPIs(filterParams.year || initialYear),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: taxSnapshotApi.createSnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['tax-kpis'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: TaxSnapshotStatus;
      note?: string;
    }) => taxSnapshotApi.updateStatus(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['tax-kpis'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: taxSnapshotApi.deleteSnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['tax-kpis'] });
    },
  });

  const handleFilterChange = useCallback((newParams: Partial<TaxSnapshotFilterParams>) => {
    setFilterParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  return {
    snapshots: snapshotsQuery.data || [],
    isLoading: snapshotsQuery.isLoading,
    isRefetching: snapshotsQuery.isRefetching,
    refetch: snapshotsQuery.refetch,
    kpis: kpisQuery.data,
    isKpiLoading: kpisQuery.isLoading,
    filterParams,
    setFilterParams: handleFilterChange,
    createSnapshot: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    deleteSnapshot: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
