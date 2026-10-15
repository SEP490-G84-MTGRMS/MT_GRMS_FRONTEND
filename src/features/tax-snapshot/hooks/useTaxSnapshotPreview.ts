import { useQuery } from '@tanstack/react-query';
import { taxSnapshotApi } from '../api/taxSnapshotApi';

export function useTaxSnapshotPreview(year: number, quarter: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['tax-preview', year, quarter],
    queryFn: () => taxSnapshotApi.previewTaxSnapshot(year, quarter),
    enabled: enabled && year > 2000 && quarter >= 1 && quarter <= 4,
    staleTime: 1000 * 30, // 30s
  });
}
