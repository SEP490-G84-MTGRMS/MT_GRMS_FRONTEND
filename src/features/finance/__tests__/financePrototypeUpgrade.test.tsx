import { describe, expect, it } from 'vitest';
import { resolvePresetRange } from '../utils/periodRanges';

describe('finance overview period boundaries', () => {
  const now = new Date(2026, 10, 15, 12, 0, 0);

  it('resolves current and previous month boundaries', () => {
    expect(resolvePresetRange('THIS_MONTH', now)).toEqual({ startDate: '2026-11-01', endDate: '2026-11-15' });
    expect(resolvePresetRange('LAST_MONTH', now)).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31' });
  });

  it('resolves the last seven days inclusively', () => {
    expect(resolvePresetRange('LAST_7_DAYS', now)).toEqual({ startDate: '2026-11-09', endDate: '2026-11-15' });
  });

  it('resolves quarter and year starts', () => {
    expect(resolvePresetRange('THIS_QUARTER', now).startDate).toBe('2026-10-01');
    expect(resolvePresetRange('THIS_YEAR', now).startDate).toBe('2026-01-01');
  });
});
