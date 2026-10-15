import { Task } from "@/types/task";

export type TaskCategory = "LONG_PENDING" | "NEW" | "COMPLETED" | "DISCARDED";

// Display order: red, amber, green, grey.
export const CATEGORY_ORDER: TaskCategory[] = ["LONG_PENDING", "NEW", "COMPLETED", "DISCARDED"];

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// Spring serializes LocalDateTime as an ISO string or a [y, m, d, h, min, s] array.
function parseBackendDate(value: Task["createdAt"]): Date | null {
  if (!value || (Array.isArray(value) && value.length < 3)) return null;
  const date = Array.isArray(value)
    ? new Date(value[0], value[1] - 1, value[2], value[3] ?? 0, value[4] ?? 0, value[5] ?? 0)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Falls back to the ObjectId's embedded creation time (first 4 bytes, in seconds).
export function taskCreatedAt(task: Task): Date {
  return parseBackendDate(task.createdAt) ?? new Date(Number.parseInt(task.id.substring(0, 8), 16) * 1000);
}

export function taskCategory(task: Task, now: number = Date.now()): TaskCategory {
  if (task.discarded) return "DISCARDED";
  if (task.completed) return "COMPLETED";
  return now - taskCreatedAt(task).getTime() > TWO_WEEKS_MS ? "LONG_PENDING" : "NEW";
}

function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function formatPendingFor(task: Task, now: number): string {
  return formatDuration(now - taskCreatedAt(task).getTime());
}

function taskLastUpdatedAt(task: Task): Date | null {
  return parseBackendDate(task.lastUpdatedAt);
}

// Null when the backend didn't send lastUpdatedAt.
export function formatTimeTaken(task: Task): string | null {
  const updated = taskLastUpdatedAt(task);
  return updated ? formatDuration(updated.getTime() - taskCreatedAt(task).getTime()) : null;
}
