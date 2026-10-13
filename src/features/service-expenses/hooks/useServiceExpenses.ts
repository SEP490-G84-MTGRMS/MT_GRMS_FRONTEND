import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelServiceExpense,
  createServiceExpense,
  getExpenseSummary,
  getServiceExpenses,
  payServiceExpense,
} from '../api/expenseApi';
import type {
  CreateExpenseRequest,
  ExpenseFilterParams,
  PayExpenseRequest,
} from '../types/expense.types';

/**
 * Query key definitions for service expenses
 */
export const expenseKeys = {
  all: ['service-expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (params?: ExpenseFilterParams) => [...expenseKeys.lists(), params] as const,
  summaries: () => [...expenseKeys.all, 'summary'] as const,
  summary: (branchId?: string) => [...expenseKeys.summaries(), branchId] as const,
};

/**
 * Hook to retrieve filtered and paged service expenses
 * @param params Filter criteria
 */
export const useServiceExpenses = (params?: ExpenseFilterParams) => {
  return useQuery({
    queryKey: expenseKeys.list(params),
    queryFn: () => getServiceExpenses(params),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook to retrieve monthly KPI summary cards
 * @param branchId Optional branch ID
 */
export const useExpenseSummary = (branchId?: string) => {
  return useQuery({
    queryKey: expenseKeys.summary(branchId),
    queryFn: () => getExpenseSummary(branchId),
    staleTime: 1000 * 60,
  });
};

/**
 * Hook mutation to create a new expense
 */
export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseRequest) => createServiceExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.summaries() });
    },
  });
};

/**
 * Hook mutation to confirm payment of an expense
 */
export const usePayExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      expenseId,
      data,
    }: {
      expenseId: string;
      data: PayExpenseRequest;
    }) => payServiceExpense(expenseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.summaries() });
    },
  });
};

/**
 * Hook mutation to cancel an existing expense
 */
export const useCancelExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      expenseId,
      reason,
    }: {
      expenseId: string;
      reason: string;
    }) => cancelServiceExpense(expenseId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.summaries() });
    },
  });
};
