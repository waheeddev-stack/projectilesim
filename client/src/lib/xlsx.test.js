import { describe, expect, it } from 'vitest';
import { simulate } from '../physics/engine.js';
import { experimentSheets, runSheets } from './exportReadings.js';
import { buildWorkbook, columnName, crc32 } from './xlsx.js';

const text = (bytes) => new TextDecoder().decode(bytes);

describe('xlsx writer', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('names columns like Excel', () => {
    expect([0, 25, 26, 51, 52].map(columnName)).toEqual(['A', 'Z', 'AA', 'AZ', 'BA']);
  });

  it('writes a zip with numeric and escaped text cells', () => {
    const file = buildWorkbook([{ name: 'A/B', rows: [['h'], [1.5], ['<=1+1 & "q">']] }]);
    const content = text(file);
    expect(content.startsWith('PK')).toBe(true);
    expect(content).toContain('<sheet name="A B"');
    expect(content).toContain('<c r="A2"><v>1.5</v></c>');
    expect(content).toContain('&lt;=1+1 &amp; &quot;q&quot;&gt;');
    expect(content).not.toContain('<f>');
  });
});

describe('export sheets', () => {
  it('exports a summary and every trajectory reading per run', () => {
    const params = { angle: 45, velocity: 20, airResistanceEnabled: false };
    const result = simulate(params);
    const sheets = runSheets([{ number: 1, params, result, ideal: null }]);
    expect(sheets.map((s) => s.name)).toEqual(['Summary', 'Run 1']);
    expect(sheets[1].rows).toHaveLength(result.points.length + 1);
  });

  it('exports saved experiments with target details', () => {
    const [sheet] = experimentSheets([
      { id: 7, createdAt: '2026-01-01T00:00:00Z', mode: 'target', targetAttempt: { hit: true, score: 90, missDistance: 0 } },
    ]);
    expect(sheet.rows[1]).toHaveLength(sheet.rows[0].length);
    expect(sheet.rows[1]).toContain('yes');
  });
});
