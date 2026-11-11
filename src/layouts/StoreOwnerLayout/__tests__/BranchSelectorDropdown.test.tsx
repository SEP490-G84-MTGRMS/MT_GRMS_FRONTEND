// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BranchSelectorDropdown } from '../BranchSelectorDropdown';
import {
  branchManagementApi,
  emitBranchesUpdated,
  type BranchItemResponse,
} from '../../../pages/store/api/branchManagementApi';

describe('BranchSelectorDropdown Component', () => {
  const initialBranches: BranchItemResponse[] = [
    {
      id: 'br-1',
      code: 'BR-01',
      name: 'Chi Nhánh Quận 1',
      address: '45 Lê Duẩn, Q1',
      status: 'Active',
      isHeadquarter: true,
      pendingOrdersCount: 0,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'br-2',
      code: 'BR-02',
      name: 'Chi Nhánh Cầu Giấy',
      address: '88 Cầu Giấy, HN',
      status: 'Active',
      isHeadquarter: false,
      pendingOrdersCount: 0,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(branchManagementApi, 'getBranches').mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        items: initialBranches,
        page: 1,
        pageSize: 50,
        totalItems: 2,
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders initial branch on topbar and loads backend branches', async () => {
    render(
      <MemoryRouter>
        <BranchSelectorDropdown />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chi Nhánh Quận 1')).toBeInTheDocument();
    });
  });

  it('opens dropdown and displays list of branches and branch count', async () => {
    render(
      <MemoryRouter>
        <BranchSelectorDropdown />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chi Nhánh Quận 1')).toBeInTheDocument();
    });

    // Click to open dropdown
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Chi Nhánh Quận 1/i }));
    });

    expect(screen.getByText('2 chi nhánh')).toBeInTheDocument();
    expect(screen.getByText('Toàn hệ thống')).toBeInTheDocument();
    expect(screen.getByText('Chi Nhánh Cầu Giấy')).toBeInTheDocument();
  });

  it('updates topbar immediately when a new branch is added via emitBranchesUpdated', async () => {
    const newBranch: BranchItemResponse = {
      id: 'br-3',
      code: 'BR-03',
      name: 'Chi Nhánh Đà Nẵng Mới',
      address: '123 Hải Châu, Đà Nẵng',
      status: 'Active',
      isHeadquarter: false,
      pendingOrdersCount: 0,
      createdAt: '2026-01-01T00:00:00Z',
    };

    render(
      <MemoryRouter>
        <BranchSelectorDropdown />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chi Nhánh Quận 1')).toBeInTheDocument();
    });

    // Mock API returning updated 3 branches on subsequent refetch
    vi.spyOn(branchManagementApi, 'getBranches').mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        items: [...initialBranches, newBranch],
        page: 1,
        pageSize: 50,
        totalItems: 3,
      },
    });

    // Simulate adding branch event
    act(() => {
      emitBranchesUpdated({
        action: 'create',
        branch: newBranch,
        selectCreated: true,
      });
    });

    // Topbar header should immediately update to the new branch
    await waitFor(() => {
      expect(screen.getByText('Chi Nhánh Đà Nẵng Mới')).toBeInTheDocument();
    });

    // Open dropdown to check list and count
    fireEvent.click(screen.getByRole('button', { name: /Chi Nhánh Đà Nẵng Mới/i }));

    await waitFor(() => {
      expect(screen.getByText('3 chi nhánh')).toBeInTheDocument();
      expect(screen.getByText('123 Hải Châu, Đà Nẵng')).toBeInTheDocument();
    });
  });

  it('updates branch name on topbar when an existing branch is updated', async () => {
    render(
      <MemoryRouter>
        <BranchSelectorDropdown />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chi Nhánh Quận 1')).toBeInTheDocument();
    });

    const updatedBranch: BranchItemResponse = {
      ...initialBranches[0],
      name: 'Chi Nhánh Quận 1 Flagship',
    };

    act(() => {
      emitBranchesUpdated({
        action: 'update',
        branch: updatedBranch,
        branchId: updatedBranch.id,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Chi Nhánh Quận 1 Flagship')).toBeInTheDocument();
    });
  });

  it('allows switching branch from the dropdown menu', async () => {
    const branchChangedListener = vi.fn();
    window.addEventListener('mtgrms:branch-changed', branchChangedListener);

    render(
      <MemoryRouter>
        <BranchSelectorDropdown />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chi Nhánh Quận 1')).toBeInTheDocument();
    });

    // Open dropdown
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Chi Nhánh Quận 1/i }));
    });

    // Select second branch
    const secondBranchBtn = screen.getByText('Chi Nhánh Cầu Giấy').closest('button');
    expect(secondBranchBtn).not.toBeNull();
    act(() => {
      fireEvent.click(secondBranchBtn!);
    });

    // Topbar updates to second branch
    expect(screen.getByText('Chi Nhánh Cầu Giấy')).toBeInTheDocument();
    expect(branchChangedListener).toHaveBeenCalled();

    window.removeEventListener('mtgrms:branch-changed', branchChangedListener);
  });
});
