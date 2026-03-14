// lib/auth.ts
// This module handles all authentication operations using Supabase Auth.
// It keeps auth logic separate from UI components, making the code easier to understand and test.
// Each function returns a simple result object with user and error.

import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

// Type for the result of auth operations.
export interface AuthResult {
  user: User | null;
  error: Error | null;
}

// registerUser: Creates a new user account with email and password.
// Supabase sends a confirmation email automatically.
export async function registerUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, error };
}

// loginUser: Signs in an existing user.
export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data.user, error };
}

// getCurrentUser: Gets the currently signed-in user, or null if none.
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// logoutUser: Signs out the current user.
export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}
