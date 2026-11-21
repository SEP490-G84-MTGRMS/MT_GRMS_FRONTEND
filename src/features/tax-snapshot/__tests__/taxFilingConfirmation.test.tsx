import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { mockSnapshotsList } from '../api/mockTaxData';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import { TaxSnapshotDetailDrawer } from '../components/TaxSnapshotDetailDrawer';

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { role: 'STORE_OWNER' } }),
}));

vi.mock('../api/taxSnapshotApi', () => ({
  taxSnapshotApi: { getFilingConfirmation: vi.fn(), confirmFiling: vi.fn() },
}));

it('records filing confirmation and displays the recorded state when reopened', async () => {
  const timestamp = '2026-11-22T01:00:00Z';
  const snapshot = { ...mockSnapshotsList[0], status: 'Finalized' as const };
  const read = vi.mocked(taxSnapshotApi.getFilingConfirmation);
  read.mockResolvedValueOnce(null).mockResolvedValueOnce(timestamp);
  vi.mocked(taxSnapshotApi.confirmFiling).mockResolvedValue(timestamp);

  const onClose = vi.fn();
  const { rerender } = render(<TaxSnapshotDetailDrawer snapshot={snapshot} isOpen onClose={onClose} />);
  const confirmButton = screen.getByRole('button', { name: 'Đánh dấu đã nộp hồ sơ' });
  await waitFor(() => expect(confirmButton).toBeEnabled());
  fireEvent.click(confirmButton);
  expect(await screen.findByText('Đã ghi nhận nộp hồ sơ')).toBeInTheDocument();
  expect(taxSnapshotApi.confirmFiling).toHaveBeenCalledWith(snapshot.id, expect.any(AbortSignal));

  rerender(<TaxSnapshotDetailDrawer snapshot={snapshot} isOpen={false} onClose={onClose} />);
  rerender(<TaxSnapshotDetailDrawer snapshot={snapshot} isOpen onClose={onClose} />);
  expect(await screen.findByText('Đã ghi nhận nộp hồ sơ')).toBeInTheDocument();
  expect(taxSnapshotApi.confirmFiling).toHaveBeenCalledTimes(1);
});
