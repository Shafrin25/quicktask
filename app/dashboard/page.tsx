"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TaskListSidebar from "@/components/TaskListSidebar";
import NotificationBell from "@/components/NotificationBell";
import { DndContext, pointerWithin, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { getCurrentUser, logoutUser } from "@/lib/auth";
import {
  fetchTasksForUser,
  addTaskForUser,
  toggleTaskCompletion,
  deleteTaskById,
  Task,
} from "@/lib/taskService";
import { supabase } from "@/lib/supabaseClient";
import { Menu, Sun, Moon, LogOut, Plus } from "lucide-react";
import TaskCard from "./TaskCard";
import { logAction } from "@/lib/auditService";

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listFromUrl = searchParams.get("list");
  const [lists, setLists] = useState<any[]>([]);
  const [description, setDescription] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [editedPriority, setEditedPriority] =
  useState<"High" | "Medium" | "Low">("Medium");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [userId, setUserId] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [selectedList, setSelectedList] = useState<string | null>(listFromUrl);
  const [showSidebar, setShowSidebar] = useState(false);

  // Initialize component after mount
  useEffect(() => {
    setMounted(true);
    const theme = localStorage.getItem("theme");
    setIsDark(theme === "dark");
  }, []);

  // Persist theme to localStorage
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark, mounted]);
  
  async function refreshTasks(id?: string) {
    const uid = id || userId;
    if (!uid) {
      return;
    }
    const list = await fetchTasksForUser(uid, selectedList || undefined);
    setTasks(list);
  }

  useEffect(() => {
    if (mounted && userId && selectedList) {
      refreshTasks();
    }
  }, [selectedList, userId, mounted]);

  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      await refreshTasks(user.id);
    }
    if (mounted) {
      loadData();
    }
  }, [mounted, router]);

  async function addTask() {

  if (!selectedList) {
    alert("Please select a task list first");
    return;
  }

  if (!title.trim()) return;

  const { error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      user_id: userId,
      list_id: selectedList,
      due_date: dueDate || null,
      priority
    });

  if (error) {
    console.error("Add task error:", error);
    return;
  }

  setTitle("");
  setDescription("");
  setDueDate("");
  setPriority("Medium");

  refreshTasks();
}
  async function updateTask(taskId: string) {

  if (!editedTitle.trim()) return;

  const { error } = await supabase
    .from("tasks")
    .update({
      title: editedTitle,
      description: editedDescription,
      due_date: editedDate || null,
      priority: editedPriority
    })
    .eq("id", taskId);

  if (error) {
    console.error("Update error:", error);
    return;
  }

  setEditingTaskId(null);

  await logAction(userId, "UPDATE_TASK", taskId);

  refreshTasks();
}
  

  async function toggleTask(id: string, completed: boolean) {

  const { error } = await supabase
    .from("tasks")
    .update({ completed: !completed })
    .eq("id", id);

  if (error) {
    console.error("Toggle error:", error);
    return;
  }

  await logAction(userId, "TOGGLE_COMPLETE", id);

  refreshTasks();
}
  async function loadLists() {
  const { data } = await supabase
    .from("task_lists")
    .select("*");

  if (data) setLists(data);
}
  async function deleteTask(id: string) {

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete error:", error);
    return;
  }

  await logAction(userId, "DELETE_TASK", id);

  refreshTasks();
}
useEffect(() => {
  loadLists();
}, []);
async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;

  if (!over) return;

  const taskId = active.id as string;
  const dropId = over.id as string;

  // check if dropped on sidebar list
  const targetList = lists.find((list) => list.id === dropId);

  if (targetList) {
    const { error } = await supabase
      .from("tasks")
      .update({ list_id: dropId })
      .eq("id", taskId);

    if (error) {
      console.error(error);
      return;
    }
    await logAction(userId, "MOVE_TASK", taskId, dropId);
    // remove task from current list view
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    return;
  }

  // reorder tasks
  if (tasks.some((t) => t.id === over.id)) {
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);

    if (oldIndex !== newIndex) {
      setTasks((items) => arrayMove(items, oldIndex, newIndex));
    }
  }
}

  async function logout() {
    await logoutUser();
    router.push("/");
  }

  if (!mounted) {
    return null;
  }

 return (
 

<DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>

    <div
      className={`flex flex-col md:flex-row min-h-screen w-full box-border ${
        isDark ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64">
  <TaskListSidebar
    selectedList={selectedList}
    setSelectedList={setSelectedList}
    isDark={isDark}
  />
</div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen w-64 z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <TaskListSidebar
          selectedList={selectedList}
          setSelectedList={(val) => {
            setSelectedList(val);
            setShowSidebar(false);
          }}
          isDark={isDark}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full px-3 py-4 md:px-6 md:py-6 box-border overflow-y-auto flex justify-center">
        <div
  className={`w-full max-w-4xl mx-auto p-3 md:p-6 rounded-lg shadow-lg box-border ${
    isDark ? "bg-gray-800" : "bg-white"
  }`}
>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded transition flex-shrink-0"
                aria-label="Toggle sidebar"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-lg md:text-2xl font-bold">Dashboard</h1>
            </div>

            <div className="flex gap-2 w-full sm:w-auto items-center">

  {/* Notification Bell */}
  {userId && <NotificationBell userId={userId} />}

  <button
    onClick={() => setIsDark(!isDark)}
    className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded text-sm md:text-base transition flex items-center justify-center gap-2 ${
      isDark
        ? "bg-gray-700 text-yellow-400 hover:bg-gray-600"
        : "bg-gray-200 text-blue-600 hover:bg-gray-300"
    }`}
  >
    {isDark ? <Sun size={18} /> : <Moon size={18} />}
  </button>

  <button
    onClick={logout}
    className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-3 md:px-4 py-2 rounded text-sm md:text-base transition flex items-center justify-center gap-2"
  >
    <LogOut size={18} />
    Logout
  </button>

</div>
          </div>

          {/* Add Task Form */}
          <div
            className={`p-3 md:p-4 rounded-lg mb-6 border box-border ${
              isDark ? "border-gray-700 bg-gray-700" : "border-gray-300 bg-gray-50"
            }`}
          >
            <div className="space-y-3 w-full">
              <input
                type="text"
                placeholder="Enter task"
                className={`w-full p-2 border rounded text-sm md:text-base box-border ${
                  isDark
                    ? "bg-gray-600 text-white border-gray-500"
                    : "bg-white border-gray-300"
                }`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                  placeholder="Task description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border rounded"
              />
              <div className="flex flex-col md:flex-row gap-2 w-full box-border">
                <input
                  type="date"
                  className={`flex-1 p-2 border rounded text-sm box-border ${
                    isDark
                      ? "bg-gray-600 text-white border-gray-500"
                      : "bg-white border-gray-300"
                  }`}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />

                <select
                  className={`flex-1 p-2 border rounded text-sm box-border ${
                    isDark
                      ? "bg-gray-600 text-white border-gray-500"
                      : "bg-white border-gray-300"
                  }`}
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as "High" | "Medium" | "Low")
                  }
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                
                </select>

                <button
                  onClick={addTask}
                  className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm md:text-base transition flex-shrink-0 flex items-center justify-center gap-2"
                  aria-label="Add task"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Task List */}
<SortableContext
  items={tasks.map((t) => t.id)}
  strategy={verticalListSortingStrategy}
>
  <div className="space-y-2 w-full box-border">
    {tasks.length === 0 ? (
      <p
        className={`text-center py-6 text-sm md:text-base ${
          isDark ? "text-gray-400" : "text-gray-500"
        }`}
      >
        No tasks yet
      </p>
    ) : (
      tasks.map((task) => (
  <TaskCard
    key={task.id}
    task={task}
    lists={lists}
    isDark={isDark}
    isEditing={editingTaskId === task.id}

    editedTitle={editedTitle}
    editedDate={editedDate}
    editedPriority={editedPriority}
    editedDescription={editedDescription}

    onDateChange={setEditedDate}
    onPriorityChange={setEditedPriority}
    onDescriptionChange={setEditedDescription}

    onStartEdit={() => {
      setEditingTaskId(task.id);
      setEditedTitle(task.title);
      setEditedDate(task.due_date || "");
      setEditedPriority(task.priority);
      setEditedDescription(task.description || "");
    }}

    onEditChange={(value) => setEditedTitle(value)}

    onSave={() => updateTask(task.id)}
    onCancel={() => setEditingTaskId(null)}
    onToggleComplete={() => toggleTask(task.id, task.completed)}
    onDelete={() => deleteTask(task.id)}
  />
))
    )}
  </div>
</SortableContext>
          
        </div>
      </div>
    </div>
  </DndContext>
  );
}

