import { describe, it, expect } from 'vitest';
import { exportRiskToCSV } from '../utils/exportToCSV';

describe('exportRiskToCSV', () => {
  it('should return undefined if no data is provided', () => {
    const result = exportRiskToCSV(null);
    expect(result).toBeUndefined();
  });

  it('should return undefined if data array is empty', () => {
    const result = exportRiskToCSV([]);
    expect(result).toBeUndefined();
  });

  it('should correctly format and return CSV content string in Node/Test environment', () => {
    const mockData = [
      {
        studentId: 'STU123',
        riskLevel: 'High',
        primaryTriggers: ['Attendance Drop', 'Late Arrivals'],
        earlyWarningNotes: 'Needs immediate follow-up.',
        createdAt: '2026-06-04T12:00:00.000Z'
      }
    ];

    const result = exportRiskToCSV(mockData);
    
    // Verifies headers are present
    expect(result).toContain('Student ID,Risk Level,Primary Triggers,Early Warning Notes,Generated At');
    // Verifies data formatting with quotes
    expect(result).toContain('"STU123"');
    expect(result).toContain('"High"');
    expect(result).toContain('"Attendance Drop, Late Arrivals"');
    expect(result).toContain('"Needs immediate follow-up."');
  });
});
