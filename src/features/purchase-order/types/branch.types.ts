import type { BranchListItem } from './po.types';

export interface BranchFilterParams {
  keyword?: string;
  branchCode?: string;
  branchCodes?: string[];
  branchNames?: string[];
  addresses?: string[];
  phones?: string[];
  status?: string;
  pageIndex?: number;
  pageSize?: number;
}

export type { BranchListItem };
