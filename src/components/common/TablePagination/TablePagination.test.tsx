import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TablePagination } from './TablePagination';

describe('TablePagination Component', () => {
  it('renders records summary correctly', () => {
    render(
      <TablePagination
        currentPage={1}
        pageSize={10}
        totalItems={45}
        itemLabel="khách hàng"
        onPageChange={() => {}}
      />
    );

    expect(screen.getByText(/Hiển thị/)).toBeDefined();
    expect(screen.getByText('1 - 10')).toBeDefined();
    expect(screen.getByText('45')).toBeDefined();
    expect(screen.getByText(/khách hàng/)).toBeDefined();
  });

  it('handles empty items correctly (0 items)', () => {
    render(
      <TablePagination
        currentPage={1}
        pageSize={10}
        totalItems={0}
        itemLabel="sản phẩm"
        onPageChange={() => {}}
      />
    );

    expect(screen.getByText('0 - 0')).toBeDefined();
  });

  it('disables previous button on first page and triggers next page on click', () => {
    const handlePageChange = vi.fn();
    render(
      <TablePagination
        currentPage={1}
        pageSize={10}
        totalItems={30}
        onPageChange={handlePageChange}
      />
    );

    const prevBtn = screen.getByLabelText('Previous Page') as HTMLButtonElement;
    const nextBtn = screen.getByLabelText('Next Page') as HTMLButtonElement;

    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('triggers onPageChange when clicking specific page number', () => {
    const handlePageChange = vi.fn();
    render(
      <TablePagination
        currentPage={1}
        pageSize={10}
        totalItems={30}
        onPageChange={handlePageChange}
      />
    );

    const page2Btn = screen.getByText('2');
    fireEvent.click(page2Btn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('triggers onPageSizeChange when selecting different page size', () => {
    const handlePageSizeChange = vi.fn();
    const handlePageChange = vi.fn();
    render(
      <TablePagination
        currentPage={1}
        pageSize={10}
        totalItems={50}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '20' } });
    expect(handlePageSizeChange).toHaveBeenCalledWith(20);
  });
});
