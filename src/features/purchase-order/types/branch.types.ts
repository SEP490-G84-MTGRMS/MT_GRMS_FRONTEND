import type { BranchListItem } from './po.types';

export interface BranchFilterParams {
  keyword?: string;
  branchCode?: string;
  status?: 'all' | 'active' | 'inactive';
  dateFrom?: string;
  dateTo?: string;
  pageIndex?: number;
  pageSize?: number;
}

export type { BranchListItem };
