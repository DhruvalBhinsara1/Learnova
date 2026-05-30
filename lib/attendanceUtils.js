/**
 * Calculate attendance percentage
 * @param {number} attended - Number of classes attended
 * @param {number} total - Total number of classes held
 * @returns {number} Percentage rounded to 2 decimal places
 * @throws {Error} When total is 0 (division by zero)
 */
export function calculateAttendancePercentage(attended, total) {
  if (total === 0) {
    throw new Error('Total classes cannot be zero');
  }
  if (attended < 0 || total < 0) {
    throw new Error('Attendance values cannot be negative');
  }
  if (attended > total) {
    throw new Error('Attended classes cannot exceed total classes');
  }
  return Math.round((attended / total) * 10000) / 100;
}

/**
 * Count attendance by status from records array
 * @param {Array} records - Array of attendance records
 * @returns {{ present: number, absent: number, late: number }}
 */
export function countAttendanceByStatus(records) {
  if (!Array.isArray(records)) {
    throw new Error('Records must be an array');
  }
  return records.reduce(
    (acc, record) => {
      const status = record.status?.toLowerCase();
      if (status === 'present') acc.present += 1;
      else if (status === 'absent') acc.absent += 1;
      else if (status === 'late') acc.late += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );
}

/**
 * Check if attendance is below threshold
 * @param {number} percentage - Current attendance percentage
 * @param {number} threshold - Minimum required percentage (default 75)
 * @returns {boolean} True if below threshold
 */
export function isBelowThreshold(percentage, threshold = 75) {
  if (typeof percentage !== 'number' || typeof threshold !== 'number') {
    throw new Error('Percentage and threshold must be numbers');
  }
  return percentage < threshold;
}

/**
 * Get attendance status label
 * @param {number} percentage
 * @returns {'excellent' | 'good' | 'warning' | 'critical'}
 */
export function getAttendanceStatus(percentage) {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 75) return 'good';
  if (percentage >= 60) return 'warning';
  return 'critical';
}
