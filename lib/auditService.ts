import { supabase } from "./supabaseClient";

export async function logAction(
  userId: string,
  action: string,
  taskId?: string,
  listId?: string,
  details?: string
) {
  await supabase.from("audit_logs").insert([
    {
      user_id: userId,
      action,
      task_id: taskId || null,
      list_id: listId || null,
      details: details || null,
    },
  ]);
}