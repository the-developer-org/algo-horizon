export interface Task {
  id: string;
  description: string;
  completed: boolean;
  discarded: boolean;
  createdBy: string;
  // Spring serializes LocalDateTime as an ISO string or a [y, m, d, h, min, s, nanos] array.
  createdAt?: string | number[] | null;
  lastUpdatedAt?: string | number[] | null;
}

export interface TasksResponse {
  tasksList: Task[];
  statusText: string;
}
