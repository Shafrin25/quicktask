// lib/taskService.ts
// Handles database operations related to tasks.

import { supabase } from "./supabaseClient";
import { createNotification } from "./notificationService";
import { logAction } from "./auditService";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  user_id: string;
  list_id?: string;
  created_at: string;
  due_date?: string | null;
  priority: "High" | "Medium" | "Low";
  status: "mytasks" | "college" | "job";
}

// Fetch tasks for a user
export async function fetchTasksForUser(
  userId: string,
  listId?: string
): Promise<Task[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId);

  if (listId) {
    query = query.eq("list_id", listId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return data as Task[];
}
// Add a new task
export async function addTaskForUser(
  title: string,
  description: string,
  userId: string,
  listId: string,
  dueDate?: string,
  priority: "High" | "Medium" | "Low" = "Medium"
): Promise<void> {

  if (!title) return;

  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        title: title,
        user_id: userId,
        list_id: listId,
        completed: false,
        due_date: dueDate || null,
        priority: priority
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Error adding task:", error);
    return;
  }

  // Audit Log
  await logAction(userId, "CREATE_TASK", data.id, listId, title);
}
// Create task with assignment notification
export async function createTask(task: any, assignedUserId: string) {

  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();

  if (!error) {

    await createNotification(
      assignedUserId,
      "You have been assigned a new task"
    );

    await logAction(
      assignedUserId,
      "ASSIGN_TASK",
      data.id,
      data.list_id,
      data.title
    );
  }
}

// Update task
export async function updateTask(
  taskId: string,
  updates: any,
  assignedUserId: string
) {

  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId);

  if (!error) {

    await createNotification(
      assignedUserId,
      "Task schedule was updated"
    );
        await logAction(
      assignedUserId,
      "UPDATE_TASK",
      taskId,
      updates.list_id,
      updates.title
    );
  }
}

// Toggle task completion
export async function toggleTaskCompletion(
  taskId: string,
  currentValue: boolean,
  userId: string
): Promise<void> {

  const { error } = await supabase
    .from("tasks")
    .update({ completed: !currentValue })
    .eq("id", taskId);

  if (!error) {
    await logAction(userId, "TOGGLE_COMPLETE", taskId);
  }
}

// Delete task
export async function deleteTaskById(
  taskId: string,
  userId: string
): Promise<void> {

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (!error) {
    await logAction(userId, "DELETE_TASK", taskId);
  }
}
// Real-time task subscription
export function subscribeToTasks(onChange: () => void) {

  return supabase
    .channel("tasks-channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
      },
      () => {
        onChange();
      }
    )
    .subscribe();
}