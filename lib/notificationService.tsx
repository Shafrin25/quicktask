import { supabase } from "./supabaseClient";

export async function createNotification(userId: string, message: string) {
  const { error } = await supabase
    .from("notifications")
    .insert([{ user_id: userId, message }]);

  if (error) console.error(error);
}