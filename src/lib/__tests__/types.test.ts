import { describe, it, expect } from 'vitest';
import { STATUS_LABELS } from '@/lib/types';

describe('STATUS_LABELS', () => {
  it('maps every material status to a valid Portuguese label', () => {
    expect(STATUS_LABELS.pending).toBe('Pendente');
    expect(STATUS_LABELS.approved).toBe('Aprovado');
    expect(STATUS_LABELS.rejected).toBe('Rejeitado');
  });

  it('has exactly one label per status', () => {
    const entries = Object.entries(STATUS_LABELS);
    expect(entries).toHaveLength(3);
    const keys = Object.keys(STATUS_LABELS).sort();
    expect(keys).toEqual(['approved', 'pending', 'rejected']);
  });

  it('has no empty or blank labels', () => {
    for (const label of Object.values(STATUS_LABELS)) {
      expect(label.trim()).not.toBe('');
    }
  });

  it('every label is unique', () => {
    const labels = Object.values(STATUS_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
