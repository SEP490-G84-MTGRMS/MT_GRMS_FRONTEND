import { describe, it, expect } from 'vitest';
import { generateUuidV7 } from '../uuid';

describe('generateUuidV7', () => {
  it('should generate a valid 36-character UUID string format', () => {
    const uuid = generateUuidV7();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
    expect(uuid.length).toBe(36);
  });

  it('should have version 7 at the expected position', () => {
    const uuid = generateUuidV7();
    // Format: 8 - 4 - 4 - 4 - 12 -> version char is at index 14
    expect(uuid.charAt(14)).toBe('7');
  });

  it('should have RFC variant at the expected position', () => {
    const uuid = generateUuidV7();
    // Format: 8 - 4 - 4 - 4 - 12 -> variant char is at index 19
    expect(['8', '9', 'a', 'b']).toContain(uuid.charAt(19).toLowerCase());
  });

  it('should generate distinct UUIDs', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateUuidV7());
    }
    expect(set.size).toBe(100);
  });
});

