"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Task, TasksResponse } from "@/types/task";
import { TaskRow } from "./TaskRow";
import { CATEGORY_ORDER, TaskCategory, taskCategory, taskCreatedAt } from "./taskDate";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const FILTERS: { key: TaskCategory; label: string; active: string }[] = [
  { key: "LONG_PENDING", label: "Long time pending", active: "bg-red-500 text-white hover:bg-red-600" },
  { key: "NEW", label: "New tasks", active: "bg-amber-500 text-white hover:bg-amber-600" },
  { key: "COMPLETED", label: "Completed", active: "bg-green-600 text-white hover:bg-green-700" },
  { key: "DISCARDED", label: "Discarded", active: "bg-gray-500 text-white hover:bg-gray-600" },
];

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}/api/tasks/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TaskCategory[]>(CATEGORY_ORDER);
  const [description, setDescription] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  // Fixed at first load so ages don't tick live.
  const [now] = useState(() => Date.now());

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/tasks/get-all`);
      const data: TasksResponse = await res.json();
      if (!res.ok) throw new Error(data.statusText);
      setTasks(data.tasksList ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentUser(localStorage.getItem("currentUser") || "");
    void fetchTasks();
  }, [fetchTasks]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = description.trim();
    if (!text) return;
    try {
      await post("add-new", { description: text, completed: false, discarded: false, createdBy: currentUser });
      setDescription("");
      await fetchTasks();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add task");
    }
  };

  const updateTask = async (task: Task, changes: Pick<Task, "completed" | "discarded">) => {
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, ...changes } : t)));
    try {
      await post("update-task", { ...task, ...changes });
    } catch (err: any) {
      setTasks(prev => prev.map(t => (t.id === task.id ? task : t)));
      toast.error(err?.message || "Failed to update task");
    }
  };

  const toggleFilter = (key: TaskCategory) =>
    setSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

  const counts = tasks.reduce<Record<TaskCategory, number>>(
    (acc, t) => ({ ...acc, [taskCategory(t, now)]: acc[taskCategory(t, now)] + 1 }),
    { LONG_PENDING: 0, NEW: 0, COMPLETED: 0, DISCARDED: 0 }
  );

  const visible = tasks
    .filter(t => selected.includes(taskCategory(t, now)))
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(taskCategory(a, now)) - CATEGORY_ORDER.indexOf(taskCategory(b, now)) ||
        taskCreatedAt(b).getTime() - taskCreatedAt(a).getTime()
    );

  let list;
  if (loading && tasks.length === 0) {
    list = <div className="text-center py-10 text-gray-400">Loading...</div>;
  } else if (visible.length === 0) {
    list = <div className="text-center py-10 text-gray-400">No tasks found.</div>;
  } else {
    list = visible.map(task => (
      <TaskRow
        key={task.id}
        task={task}
        now={now}
        onComplete={t => updateTask(t, { completed: true, discarded: false })}
        onDiscard={t => updateTask(t, { completed: false, discarded: true })}
      />
    ));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-100 py-10 px-4 flex flex-col items-center">
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-green-700 tracking-tight">Tasks</h1>
            <p className="text-sm text-gray-500">
              {counts.LONG_PENDING + counts.NEW} pending, {counts.COMPLETED} completed, {counts.DISCARDED} discarded
            </p>
          </div>
          <Button onClick={fetchTasks} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white">
            <RefreshCw className="mr-2 h-4 w-4" />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What needs to be done?"
            className="bg-white"
          />
          <Button type="submit" disabled={!description.trim()} className="bg-green-600 hover:bg-green-700 text-white">
            Add
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className={selected.length === CATEGORY_ORDER.length ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white text-gray-500"}
            onClick={() => setSelected(CATEGORY_ORDER)}
          >
            All ({tasks.length})
          </Button>
          {FILTERS.map(f => (
            <Button
              key={f.key}
              size="sm"
              variant="outline"
              className={selected.includes(f.key) ? f.active : "bg-white text-gray-500"}
              onClick={() => toggleFilter(f.key)}
            >
              {f.label} ({counts[f.key]})
            </Button>
          ))}
        </div>

        <div className="space-y-2">{list}</div>
      </div>
    </div>
  );
}
