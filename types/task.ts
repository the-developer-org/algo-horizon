export interface Task {
  id: string;
  description: string;
  completed: boolean;
  discarded: boolean;
  createdBy: string;
}

export interface TasksResponse {
  tasksList: Task[];
  statusText: string;
}
