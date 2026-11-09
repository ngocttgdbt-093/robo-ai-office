const TASK_STATUSES = new Set(['queued', 'running', 'completed', 'failed']);

/** Normalize a task status; reject unsupported strings and non-string inputs. */
export function normalizeTaskStatus(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Task status must be a string');
  }

  const status = value.trim().toLowerCase();
  if (!TASK_STATUSES.has(status)) {
    throw new RangeError('Unsupported task status');
  }
  return status;
}
