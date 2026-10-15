import { Task } from "@/types/task";

export type TaskCategory = "LONG_PENDING" | "NEW" | "COMPLETED" | "DISCARDED";

// Display order: red, amber, green, grey.
export const CATEGORY_ORDER: TaskCategory[] = ["LONG_PENDING", "NEW", "COMPLETED", "DISCARDED"];

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// A Mongo ObjectId's first 4 bytes are its creation time in seconds.
export function taskCreatedAt(task: Task): Date {
  return new Date(Number.parseInt(task.id.substring(0, 8), 16) * 1000);
}

export function taskCategory(task: Task): TaskCategory {
  if (task.discarded) return "DISCARDED";
  if (task.completed) return "COMPLETED";
  return Date.now() - taskCreatedAt(task).getTime() > TWO_WEEKS_MS ? "LONG_PENDING" : "NEW";
}
