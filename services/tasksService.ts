import { supabase } from "@/lib/supabaseClient";

export type Task = {
  id: string;
  title: string;
  description: string;
  list_id?: string | null;
  user_id?: string | null;
  created_at?: string;
};

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tasks", error);
    return [];
  }

  return data || [];
}

export async function createTask(title: string, description: string) {
  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        title,
        description
      }
    ])
    .select();

  if (error) {
    console.error("Error creating task", error);
    throw error;
  }

  return data;
}

export async function deleteTask(id: string) {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting task", error);
  }
}