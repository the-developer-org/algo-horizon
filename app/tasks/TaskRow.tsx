"use client";
import { Button } from "@/components/ui/button";
import { Task } from "@/types/task";
import { TaskCategory, taskCategory, taskCreatedAt } from "./taskDate";

interface TaskRowProps {
  task: Task;
  onComplete: (task: Task) => void;
  onDiscard: (task: Task) => void;
}

const CATEGORY_STYLES: Record<TaskCategory, string> = {
  LONG_PENDING: "border-red-400 bg-red-50",
  NEW: "border-amber-400 bg-amber-50",
  COMPLETED: "border-green-500 bg-green-50",
  DISCARDED: "border-gray-300 bg-gray-100",
};

export function TaskRow({ task, onComplete, onDiscard }: Readonly<TaskRowProps>) {
  const category = taskCategory(task);
  const isPending = category === "LONG_PENDING" || category === "NEW";

  return (
    <div className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 shadow-sm ${CATEGORY_STYLES[category]}`}>
      <div className="flex-1">
        <div className={`text-sm ${category === "DISCARDED" ? "text-gray-500 line-through" : "text-gray-800"}`}>
          {task.description}
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Created by <b>{task.createdBy || "Unknown"}</b> on {taskCreatedAt(task).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
        </div>
      </div>
      {isPending && (
        <>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => onComplete(task)}>
            Mark as completed
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDiscard(task)}>
            Discard
          </Button>
        </>
      )}
    </div>
  );
}
