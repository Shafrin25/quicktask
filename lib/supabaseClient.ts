// lib/supabaseClient.ts
// This file creates and exports a single Supabase client instance.
// The client is configured with environment variables for security.
// All other parts of the app import this client to talk to Supabase.

import { createClient } from "@supabase/supabase-js";

// Load the URL and anon key from environment variables.
// In production, these are set securely; in development, put them in .env.local.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create the client once and reuse it everywhere.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);