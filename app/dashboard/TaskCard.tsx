"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  due_date?: string | null;
  priority: "High" | "Medium" | "Low";

};

type TaskCardProps = {
  task: Task
  lists: any[]
  isDark: boolean
  isEditing: boolean

  editedTitle: string
  editedDate: string
  editedPriority: "High" | "Medium" | "Low"
  editedDescription: string

  onStartEdit: () => void
  onEditChange: (value: string) => void
  onDateChange: (value: string) => void
  onPriorityChange: (value: "High" | "Medium" | "Low") => void
  onDescriptionChange: (value: string) => void

  onSave: () => void
  onCancel: () => void
  onToggleComplete: () => void
  onDelete: () => void
};

export default function TaskCard({
  task,
  lists,
  isDark,
  isEditing,
  editedTitle,
  editedDate,
  editedPriority,
  editedDescription,
  onStartEdit,
  onEditChange,
  onDateChange,
  onPriorityChange,
  onDescriptionChange,
  onSave,
  onCancel,
  onToggleComplete,
  onDelete
}: TaskCardProps) {
  const router = useRouter();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
};
  return (
    
    <div
  ref={setNodeRef}
  {...attributes}
  style={style}
  className={`flex flex-col gap-3 p-3 md:p-4 rounded border box-border w-full cursor-grab ${
    isDark ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"
  }`}
>
      

      {isEditing ? (
  <div className="flex flex-col md:flex-row gap-2 w-full">

    {/* Title */}
    <input
      type="text"
      value={editedTitle}
      onChange={(e) => onEditChange(e.target.value)}
      className="flex-1 p-2 border rounded"
    />
    <textarea
      value={editedDescription}
      onChange={(e) => onDescriptionChange(e.target.value)}
      placeholder="Task description"
      className="p-2 border rounded w-full"
    />
    {/* Due Date */}
    <input
      type="date"
      value={editedDate || ""}
      onChange={(e) => onDateChange(e.target.value)}
      className="p-2 border rounded"
    />

    {/* Priority */}
    <select
      value={editedPriority}
      onChange={(e) =>
        onPriorityChange(e.target.value as "High" | "Medium" | "Low")
      }
      className="p-2 border rounded"
    >
      <option value="High">High</option>
      <option value="Medium">Medium</option>
      <option value="Low">Low</option>
    </select>

    <button
      onClick={onSave}
      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
    >
      Save
    </button>

    <button
      onClick={onCancel}
      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
    >
      Cancel
    </button>

  </div>
) : (
        <>
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2">

  <span
    {...listeners}
    className="cursor-grab text-gray-400"
  >
    drag
  </span>
              {task.completed && (
                <CheckCircle2 className="text-green-600 w-5 h-5" />
              )}

              <span
                className={`font-medium text-sm md:text-base break-words ${
                  task.completed
                    ? "text-green-600"
                    : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {task.title}
                {task.description && (
  <p className="text-sm text-gray-500 mt-1">
    {task.description}
  </p>
)}
              </span>
            </div>
             <select
  className="border rounded px-2 py-1 text-sm mt-2"
  onChange={async (e) => {
    const newListId = e.target.value;

    await supabase
  .from("tasks")
  .update({ list_id: newListId })
  .eq("id", task.id);
  }}
>
  <option value="">Move to list</option>
  {lists.map((list) => (
    <option key={list.id} value={list.id}>
      {list.title}
    </option>
  ))}
</select>
            <div className="flex flex-col gap-1 mt-2 text-xs md:text-sm">
              {task.due_date && (
                <span
                  className={`flex items-center gap-2 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <Calendar size={14} />
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}

              <span
                className={
                  task.priority === "High"
                    ? "text-red-500"
                    : task.priority === "Medium"
                    ? "text-yellow-500"
                    : "text-green-500"
                }
              >
                Priority: {task.priority}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => { 
  console.log("EDIT CLICKED"); 
  onStartEdit(); 
}}>
Edit
</button>

            <button
              onClick={onToggleComplete}
              className={`text-sm px-2 py-1 ${
                task.completed
                  ? "text-yellow-600 hover:text-yellow-700"
                  : "text-green-600 hover:text-green-700"
              }`}
            >
              {task.completed ? "Undo" : "Complete"}
            </button>

            <button
              onClick={onDelete}
              className="text-red-500 hover:text-red-600 text-sm px-2 py-1"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}