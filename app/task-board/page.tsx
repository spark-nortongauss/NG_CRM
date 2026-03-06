"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { DraggableAttributes } from "@dnd-kit/core";
import { format } from "date-fns";
import {
  Calendar,
  User,
  Plus,
  GripVertical,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const BOARD_COLUMNS = [
  { id: "inbox", label: "Inbox", color: "bg-blue-500" },
  { id: "no_response", label: "No Response", color: "bg-amber-500" },
  { id: "no_interest", label: "No Interest", color: "bg-rose-500" },
  { id: "meeting_scheduled", label: "Meeting Scheduled", color: "bg-emerald-500" },
] as const;

type BoardState = (typeof BOARD_COLUMNS)[number]["id"];

interface TaskBoardUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface TaskBoardTask {
  id: string;
  title: string;
  state: BoardState;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Task Card                                                         */
/* ------------------------------------------------------------------ */
function TaskCard({
  task,
  users,
  onUpdateTitle,
  onUpdateDueDate,
  onUpdateAssignee,
  onDelete,
  isDragging,
}: {
  task: TaskBoardTask;
  users: TaskBoardUser[];
  onUpdateTitle: (task: TaskBoardTask, newTitle: string) => Promise<void>;
  onUpdateDueDate: (task: TaskBoardTask, newDate: string | null) => Promise<void>;
  onUpdateAssignee: (task: TaskBoardTask, newAssignee: string | null) => Promise<void>;
  onDelete?: (task: TaskBoardTask) => void;
  isDragging?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Title inline edit
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleAreaRef = useRef<HTMLDivElement>(null);

  // Due date inline edit
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(task.due_date || "");
  const dateInputRef = useRef<HTMLInputElement>(null);
  const dateAreaRef = useRef<HTMLSpanElement>(null);

  // Assignee inline edit
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [assigneeValue, setAssigneeValue] = useState(task.assigned_to || "");
  const assigneeSelectRef = useRef<HTMLSelectElement>(null);
  const assigneeAreaRef = useRef<HTMLSpanElement>(null);

  const assignee = task.assigned_to
    ? users.find((u) => u.id === task.assigned_to)
    : null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  // Sync local state when task prop changes
  useEffect(() => { setTitleValue(task.title); }, [task.title]);
  useEffect(() => { setDateValue(task.due_date || ""); }, [task.due_date]);
  useEffect(() => { setAssigneeValue(task.assigned_to || ""); }, [task.assigned_to]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Title: focus input when editing starts
  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  // Date: open native date picker when editing starts
  useEffect(() => {
    if (editingDate) {
      dateInputRef.current?.focus();
      // Trigger the native date picker
      dateInputRef.current?.showPicker?.();
    }
  }, [editingDate]);

  // Assignee: focus select when editing starts
  useEffect(() => {
    if (editingAssignee) {
      assigneeSelectRef.current?.focus();
    }
  }, [editingAssignee]);

  // --- Title handlers ---
  const commitTitle = async () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.title) {
      await onUpdateTitle(task, trimmed);
    } else {
      setTitleValue(task.title); // revert
    }
    setEditingTitle(false);
  };

  const discardTitle = () => {
    setTitleValue(task.title);
    setEditingTitle(false);
  };

  // --- Date handlers ---
  const commitDate = async () => {
    const newDate = dateValue || null;
    if (newDate !== task.due_date) {
      await onUpdateDueDate(task, newDate);
    }
    setEditingDate(false);
  };

  const discardDate = () => {
    setDateValue(task.due_date || "");
    setEditingDate(false);
  };

  // --- Assignee handlers ---
  const commitAssignee = async () => {
    const newAssignee = assigneeValue || null;
    if (newAssignee !== task.assigned_to) {
      await onUpdateAssignee(task, newAssignee);
    }
    setEditingAssignee(false);
  };

  const discardAssignee = () => {
    setAssigneeValue(task.assigned_to || "");
    setEditingAssignee(false);
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-ng-dark-card shadow-sm transition-all duration-200",
        "flex flex-col gap-2.5 p-3.5 min-h-[80px]",
        !editingTitle && "cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-gray-300 dark:hover:border-white/20 hover:-translate-y-0.5",
        isDragging && "opacity-90 shadow-lg ring-2 ring-blue-500/30 scale-[1.02]"
      )}
    >
      {/* Three-dot menu */}
      {onDelete && (
        <div ref={menuRef} className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen((prev) => !prev);
            }}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150",
              "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
              "hover:bg-gray-100 dark:hover:bg-white/10",
              menuOpen
                ? "opacity-100 bg-gray-100 dark:bg-white/10"
                : "opacity-0 group-hover:opacity-100"
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-ng-dark-card shadow-xl py-1 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setMenuOpen(false);
                  onDelete(task);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors">
          <GripVertical className="h-4 w-4" />
        </div>

        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitTitle(); }
              if (e.key === "Escape") { discardTitle(); }
            }}
            onBlur={discardTitle}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-medium leading-tight text-gray-800 dark:text-gray-100 bg-transparent border-0 border-b border-blue-400 dark:border-blue-500 outline-none pb-0.5 pr-6 w-full"
          />
        ) : (
          <p
            ref={titleAreaRef as React.RefObject<HTMLParagraphElement>}
            className="flex-1 text-sm font-medium leading-tight text-gray-800 dark:text-gray-100 break-words pr-6 cursor-text"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setEditingTitle(true);
            }}
            title="Click to edit title"
          >
            {task.title}
          </p>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-1.5 min-w-0">

          {/* Due date */}
          {editingDate ? (
            <span
              ref={dateAreaRef}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs",
                isOverdue
                  ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                  : "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10"
              )}
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <input
                ref={dateInputRef}
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitDate(); }
                  if (e.key === "Escape") { discardDate(); }
                }}
                onBlur={discardDate}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-0 p-0 text-xs outline-none max-w-[120px]"
              />
            </span>
          ) : (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setEditingDate(true);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors",
                isOverdue
                  ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200"
              )}
              title="Click to set due date"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[85px]">
                {task.due_date
                  ? format(new Date(task.due_date), "MMM d, yyyy")
                  : "No date"}
              </span>
            </button>
          )}

          {/* Assignee */}
          {editingAssignee ? (
            <span
              ref={assigneeAreaRef}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10"
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <select
                ref={assigneeSelectRef}
                value={assigneeValue}
                onChange={(e) => setAssigneeValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitAssignee(); }
                  if (e.key === "Escape") { discardAssignee(); }
                }}
                onBlur={discardAssignee}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-0 p-0 text-xs outline-none max-w-[100px]"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email || u.id}
                  </option>
                ))}
              </select>
            </span>
          ) : (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setEditingAssignee(true);
              }}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title="Click to assign"
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[90px]">
                {assignee?.full_name || assignee?.email || "Unassigned"}
              </span>
            </button>
          )}
        </div>
        {isOverdue && (
          <span title="Overdue">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Draggable Card wrapper                                            */
/* ------------------------------------------------------------------ */
function DraggableCard({
  task,
  users,
  onUpdateTitle,
  onUpdateDueDate,
  onUpdateAssignee,
  onDelete,
  attributes,
  listeners,
  setNodeRef,
  style,
  isDragging,
}: {
  task: TaskBoardTask;
  users: TaskBoardUser[];
  onUpdateTitle: (task: TaskBoardTask, newTitle: string) => Promise<void>;
  onUpdateDueDate: (task: TaskBoardTask, newDate: string | null) => Promise<void>;
  onUpdateAssignee: (task: TaskBoardTask, newAssignee: string | null) => Promise<void>;
  onDelete?: (task: TaskBoardTask) => void;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  setNodeRef: (el: HTMLDivElement | null) => void;
  style: React.CSSProperties;
  isDragging: boolean;
}) {
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(listeners ?? {})}>
      <TaskCard
        task={task}
        users={users}
        onUpdateTitle={onUpdateTitle}
        onUpdateDueDate={onUpdateDueDate}
        onUpdateAssignee={onUpdateAssignee}
        onDelete={onDelete}
        isDragging={isDragging}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */
export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<TaskBoardTask[]>([]);
  const [users, setUsers] = useState<TaskBoardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createColumn, setCreateColumn] = useState<BoardState | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<TaskBoardTask | null>(null);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks-board");
    if (!res.ok) return;
    const json = await res.json();
    setTasks(Array.isArray(json.data) ? json.data : []);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/tasks-board/users");
    if (!res.ok) return;
    const json = await res.json();
    setUsers(json.users ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchUsers()]).finally(() => setLoading(false));
  }, [fetchTasks, fetchUsers]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const taskId = String(active.id);
    const overId = String(over.id);
    const newState = BOARD_COLUMNS.some((c) => c.id === overId) ? (overId as BoardState) : null;
    if (!newState) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.state === newState) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, state: newState } : t))
    );

    const res = await fetch(`/api/tasks-board/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: newState }),
    });
    if (!res.ok) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, state: task.state } : t))
      );
    }
  };

  const handleCreate = async (
    state: BoardState,
    extras?: { due_date?: string | null; assigned_to?: string | null }
  ) => {
    const title = newTitle.trim();
    if (!title) return;
    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/tasks-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          state,
          due_date: extras?.due_date ?? null,
          assigned_to: extras?.assigned_to ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to create task");
        return;
      }
      const created = await res.json();
      setTasks((prev) => [created, ...prev]);
      setNewTitle("");
      setCreateColumn(null);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleUpdateTitle = async (task: TaskBoardTask, newTitle: string) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, title: newTitle } : t));
    const res = await fetch(`/api/tasks-board/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    if (!res.ok) {
      // Revert
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, title: task.title } : t));
    } else {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => t.id === task.id ? updated : t));
    }
  };

  const handleUpdateDueDate = async (task: TaskBoardTask, newDate: string | null) => {
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, due_date: newDate } : t));
    const res = await fetch(`/api/tasks-board/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ due_date: newDate }),
    });
    if (!res.ok) {
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, due_date: task.due_date } : t));
    } else {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => t.id === task.id ? updated : t));
    }
  };

  const handleUpdateAssignee = async (task: TaskBoardTask, newAssignee: string | null) => {
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, assigned_to: newAssignee } : t));
    const res = await fetch(`/api/tasks-board/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: newAssignee }),
    });
    if (!res.ok) {
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, assigned_to: task.assigned_to } : t));
    } else {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => t.id === task.id ? updated : t));
    }
  };

  const handleDelete = async (task: TaskBoardTask) => {
    setDeleteConfirmTask(task);
  };

  const confirmDeleteTask = async () => {
    if (!deleteConfirmTask) return;
    const taskId = deleteConfirmTask.id;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setDeleteConfirmTask(null);

    const res = await fetch(`/api/tasks-board/${taskId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      fetchTasks();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 dark:border-white/10 border-t-blue-500"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading task board…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Task Board
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} across {BOARD_COLUMNS.length} columns
            </p>
          </div>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.state === col.id);
            return (
              <BoardColumn
                key={col.id}
                columnId={col.id}
                columnLabel={col.label}
                columnColor={col.color}
                tasks={columnTasks}
                users={users}
                onCreateClick={() => {
                  setCreateColumn(col.id);
                  setNewTitle("");
                }}
                isCreating={createColumn === col.id}
                newTitle={newTitle}
                setNewTitle={setNewTitle}
                createSubmitting={createSubmitting}
                onCreateSubmit={(extras) => handleCreate(col.id, extras)}
                onCreateCancel={() => {
                  setCreateColumn(null);
                  setNewTitle("");
                }}
                onUpdateTitle={handleUpdateTitle}
                onUpdateDueDate={handleUpdateDueDate}
                onUpdateAssignee={handleUpdateAssignee}
                onDelete={handleDelete}
                activeId={activeId}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeId ? (
            (() => {
              const task = tasks.find((t) => t.id === activeId);
              if (!task) return null;
              return (
                <div className="w-[280px] rotate-2 opacity-95">
                  <TaskCard
                    task={task}
                    users={users}
                    onUpdateTitle={async () => { }}
                    onUpdateDueDate={async () => { }}
                    onUpdateAssignee={async () => { }}
                    isDragging
                  />
                </div>
              );
            })()
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Delete confirmation modal — keeping this one since it's a destructive action */}
      {deleteConfirmTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-ng-dark-card border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-5 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Delete Task</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Are you sure you want to delete this task?
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4 break-words">
              &ldquo;{deleteConfirmTask.title}&rdquo;
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmTask(null)}
                className="rounded-lg border border-gray-300 dark:border-white/10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Board Column                                                      */
/* ------------------------------------------------------------------ */
function BoardColumn({
  columnId,
  columnLabel,
  columnColor,
  tasks,
  users,
  onCreateClick,
  isCreating,
  newTitle,
  setNewTitle,
  createSubmitting,
  onCreateSubmit,
  onCreateCancel,
  onUpdateTitle,
  onUpdateDueDate,
  onUpdateAssignee,
  onDelete,
  activeId,
}: {
  columnId: BoardState;
  columnLabel: string;
  columnColor: string;
  tasks: TaskBoardTask[];
  users: TaskBoardUser[];
  onCreateClick: () => void;
  isCreating: boolean;
  newTitle: string;
  setNewTitle: (v: string) => void;
  createSubmitting: boolean;
  onCreateSubmit: (extras?: { due_date?: string | null; assigned_to?: string | null }) => void;
  onCreateCancel: () => void;
  onUpdateTitle: (task: TaskBoardTask, newTitle: string) => Promise<void>;
  onUpdateDueDate: (task: TaskBoardTask, newDate: string | null) => Promise<void>;
  onUpdateAssignee: (task: TaskBoardTask, newAssignee: string | null) => Promise<void>;
  onDelete: (task: TaskBoardTask) => void;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const isEmpty = tasks.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[200px] rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-ng-dark-deep flex flex-col min-h-[calc(100vh-220px)] transition-all duration-200",
        isOver && "ring-2 ring-blue-500/30 border-blue-300 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10"
      )}
    >
      {/* Column header */}
      <div className="p-3.5 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-2.5 w-2.5 rounded-full", columnColor)} />
          <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-100">
            {columnLabel}
          </h2>
          {tasks.length > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 px-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-400">
              {tasks.length}
            </span>
          )}
        </div>
      </div>

      {/* Column body */}
      <div className="flex-1 flex flex-col gap-2.5 p-3 overflow-y-auto">
        {isCreating && (
          <CreateTaskForm
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            createSubmitting={createSubmitting}
            onSubmit={onCreateSubmit}
            onCancel={onCreateCancel}
            users={users}
          />
        )}
        {tasks
          .filter((t) => t.id !== activeId)
          .map((task) => (
            <DraggableTask
              key={task.id}
              task={task}
              users={users}
              onUpdateTitle={onUpdateTitle}
              onUpdateDueDate={onUpdateDueDate}
              onUpdateAssignee={onUpdateAssignee}
              onDelete={onDelete}
            />
          ))}
        {!isCreating && (
          <button
            type="button"
            onClick={onCreateClick}
            className={cn(
              "flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
              "hover:bg-gray-100 dark:hover:bg-white/5",
              isEmpty && "mt-2"
            )}
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Task Form                                                  */
/* ------------------------------------------------------------------ */
function CreateTaskForm({
  newTitle,
  setNewTitle,
  createSubmitting,
  onSubmit,
  onCancel,
  users,
}: {
  newTitle: string;
  setNewTitle: (v: string) => void;
  createSubmitting: boolean;
  onSubmit: (extras?: { due_date?: string | null; assigned_to?: string | null }) => void;
  onCancel: () => void;
  users: TaskBoardUser[];
}) {
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (!newTitle.trim() || createSubmitting) return;
    onSubmit({ due_date: dueDate || null, assigned_to: assigneeId || null });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handler);
    };
  }, [onCancel]);

  return (
    <div ref={formRef} className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-ng-dark-card p-3 space-y-2.5 shadow-sm">
      <Input
        placeholder="Task title — press Enter to save"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
        className="text-sm border-gray-200 dark:border-white/10"
        autoFocus
        disabled={createSubmitting}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-gray-500 dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
          <Calendar className="h-3.5 w-3.5" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent border-0 p-0 text-xs max-w-[110px] outline-none"
          />
        </span>
        <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
          <User className="h-3.5 w-3.5" />
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent border-0 p-0 text-xs outline-none"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email || "Unassigned"}
              </option>
            ))}
          </select>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Draggable Task                                                    */
/* ------------------------------------------------------------------ */
function DraggableTask({
  task,
  users,
  onUpdateTitle,
  onUpdateDueDate,
  onUpdateAssignee,
  onDelete,
}: {
  task: TaskBoardTask;
  users: TaskBoardUser[];
  onUpdateTitle: (task: TaskBoardTask, newTitle: string) => Promise<void>;
  onUpdateDueDate: (task: TaskBoardTask, newDate: string | null) => Promise<void>;
  onUpdateAssignee: (task: TaskBoardTask, newAssignee: string | null) => Promise<void>;
  onDelete: (task: TaskBoardTask) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    }
    : undefined;

  return (
    <DraggableCard
      task={task}
      users={users}
      onUpdateTitle={onUpdateTitle}
      onUpdateDueDate={onUpdateDueDate}
      onUpdateAssignee={onUpdateAssignee}
      onDelete={onDelete}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      style={style ?? {}}
      isDragging={isDragging}
    />
  );
}