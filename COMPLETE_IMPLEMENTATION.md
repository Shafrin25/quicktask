# QuickTask Complete Implementation Guide

## Part 1: Database Schema

### Step 1: Run this SQL in Supabase SQL Editor

```sql
-- ============================================================================
-- TABLE: task_lists (projects that organize tasks)
-- ============================================================================
CREATE TABLE task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_lists_user_id ON task_lists(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;

-- Users can see lists they own or are members of
CREATE POLICY "Users can view lists they own or are members of" ON task_lists
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM task_list_members
      WHERE task_list_members.task_list_id = task_lists.id
      AND task_list_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own lists" ON task_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update lists they own" ON task_lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete lists they own" ON task_lists
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: task_list_members (who has access to which lists)
-- ============================================================================
CREATE TABLE task_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_list_id UUID NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_list_id, user_id)
);

CREATE INDEX idx_task_list_members_task_list_id ON task_list_members(task_list_id);
CREATE INDEX idx_task_list_members_user_id ON task_list_members(user_id);

ALTER TABLE task_list_members ENABLE ROW LEVEL SECURITY;

-- Users can see members of lists they're part of
CREATE POLICY "Users can view members of shared lists" ON task_list_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_list_members tlm2
      WHERE tlm2.task_list_id = task_list_members.task_list_id
      AND tlm2.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM task_lists tl
      WHERE tl.id = task_list_members.task_list_id
      AND tl.user_id = auth.uid()
    )
  );

-- Only list owners can manage members
CREATE POLICY "List owners can manage members" ON task_list_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_lists
      WHERE task_lists.id = task_list_id
      AND task_lists.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TABLE: tasks (update existing table to link to task_lists)
-- ============================================================================
-- If you already have a tasks table, run this to add the task_list_id column:
ALTER TABLE tasks ADD COLUMN task_list_id UUID REFERENCES task_lists(id) ON DELETE CASCADE;
CREATE INDEX idx_tasks_task_list_id ON tasks(task_list_id);

-- If you're creating the tasks table from scratch:
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_list_id UUID REFERENCES task_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  due_date DATE,
  priority TEXT DEFAULT 'Medium', -- 'High', 'Medium', 'Low'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_task_list_id ON tasks(task_list_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can see tasks in lists they own or are members of
CREATE POLICY "Users can view tasks in accessible lists" ON tasks
  FOR SELECT USING (
    auth.uid() = user_id OR
    (task_list_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM task_list_members
        WHERE task_list_members.task_list_id = tasks.task_list_id
        AND task_list_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert tasks in accessible lists" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- ============================================================================
-- TABLE: user_profiles (store user info beyond email)
-- ============================================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

---

## Part 2: Service Layer (lib/taskService.ts)

This file handles ALL database operations. Replace your current `lib/taskService.ts`:

```typescript
// lib/taskService.ts
// All database operations for tasks and task lists

import { supabase } from "./supabaseClient";

// ============================================================================
// INTERFACES (Type definitions)
// ============================================================================

export interface Task {
  id: string;
  user_id: string;
  task_list_id?: string;
  title: string;
  completed: boolean;
  due_date?: string;
  priority: "High" | "Medium" | "Low";
  created_at: string;
  updated_at: string;
}

export interface TaskList {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskListMember {
  id: string;
  task_list_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TASK LIST CRUD OPERATIONS
// ============================================================================

// Get all task lists for current user (owned + shared)
export async function fetchAllTaskLists(userId: string): Promise<TaskList[]> {
  const { data, error } = await supabase
    .from("task_lists")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching task lists:", error);
    return [];
  }

  return (data as TaskList[]) || [];
}

// Get shared task lists (lists shared with current user)
export async function fetchSharedTaskLists(userId: string): Promise<TaskList[]> {
  const { data: memberData, error: memberError } = await supabase
    .from("task_list_members")
    .select("task_list_id")
    .eq("user_id", userId);

  if (memberError) {
    console.error("Error fetching shared lists:", memberError);
    return [];
  }

  if (!memberData || memberData.length === 0) {
    return [];
  }

  const listIds = memberData.map((m) => m.task_list_id);

  const { data: lists, error: listError } = await supabase
    .from("task_lists")
    .select("*")
    .in("id", listIds)
    .order("created_at", { ascending: false });

  if (listError) {
    console.error("Error fetching lists:", listError);
    return [];
  }

  return (lists as TaskList[]) || [];
}

// Create a new task list
export async function createTaskList(
  userId: string,
  title: string,
  description?: string
): Promise<TaskList | null> {
  if (!title.trim()) {
    console.error("List title cannot be empty");
    return null;
  }

  const { data, error } = await supabase
    .from("task_lists")
    .insert([{ user_id: userId, title, description }])
    .select()
    .single();

  if (error) {
    console.error("Error creating task list:", error);
    return null;
  }

  return (data as TaskList) || null;
}

// Update a task list
export async function updateTaskList(
  listId: string,
  title: string,
  description?: string
): Promise<void> {
  const { error } = await supabase
    .from("task_lists")
    .update({
      title,
      description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listId);

  if (error) {
    console.error("Error updating task list:", error);
  }
}

// Delete a task list
export async function deleteTaskList(listId: string): Promise<void> {
  const { error } = await supabase.from("task_lists").delete().eq("id", listId);

  if (error) {
    console.error("Error deleting task list:", error);
  }
}

// ============================================================================
// TASK CRUD OPERATIONS
// ============================================================================

// Get all tasks for a user (not in any list)
export async function fetchTasksForUser(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .is("task_list_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return (data as Task[]) || [];
}

// Get all tasks in a specific list
export async function fetchTasksForList(listId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("task_list_id", listId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tasks for list:", error);
    return [];
  }

  return (data as Task[]) || [];
}

// Create a new task
export async function createTask(
  userId: string,
  title: string,
  taskListId?: string,
  dueDate?: string,
  priority: "High" | "Medium" | "Low" = "Medium"
): Promise<Task | null> {
  if (!title.trim()) {
    console.error("Task title cannot be empty");
    return null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        user_id: userId,
        task_list_id: taskListId || null,
        title: title.trim(),
        completed: false,
        due_date: dueDate || null,
        priority,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating task:", error);
    return null;
  }

  return (data as Task) || null;
}

// Toggle task completion
export async function toggleTaskCompletion(
  taskId: string,
  completed: boolean
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({
      completed: !completed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    console.error("Error toggling task:", error);
  }
}

// Update task
export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    console.error("Error updating task:", error);
  }
}

// Delete a task
export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    console.error("Error deleting task:", error);
  }
}

// ============================================================================
// SHARING & COLLABORATION
// ============================================================================

// Share a list with another user by email
export async function shareListWithUserByEmail(
  listId: string,
  userEmail: string,
  role: "editor" | "viewer" = "viewer"
): Promise<boolean> {
  try {
    // First, find the user by email
    const { data: users, error: userError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (userError) {
      console.error("User not found:", userError);
      return false;
    }

    // Add user to task_list_members
    const { error } = await supabase
      .from("task_list_members")
      .insert([
        {
          task_list_id: listId,
          user_id: users.id,
          role,
        },
      ]);

    if (error) {
      console.error("Error sharing list:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error in shareListWithUserByEmail:", err);
    return false;
  }
}

// Get members of a task list
export async function fetchListMembers(listId: string): Promise<TaskListMember[]> {
  const { data, error } = await supabase
    .from("task_list_members")
    .select("*")
    .eq("task_list_id", listId);

  if (error) {
    console.error("Error fetching list members:", error);
    return [];
  }

  return (data as TaskListMember[]) || [];
}

// Remove a user from a shared list
export async function removeUserFromList(
  listId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("task_list_members")
    .delete()
    .eq("task_list_id", listId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing user from list:", error);
  }
}

// Update member role
export async function updateMemberRole(
  listId: string,
  userId: string,
  role: "editor" | "viewer"
): Promise<void> {
  const { error } = await supabase
    .from("task_list_members")
    .update({ role })
    .eq("task_list_id", listId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating member role:", error);
  }
}

// ============================================================================
// USER PROFILES
// ============================================================================

// Get user profile
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return (data as UserProfile) || null;
}

// Create user profile
export async function createUserProfile(
  userId: string,
  email: string,
  displayName?: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .insert([
      {
        id: userId,
        email,
        display_name: displayName || email.split("@")[0],
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating user profile:", error);
    return null;
  }

  return (data as UserProfile) || null;
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  displayName?: string,
  avatarUrl?: string
): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user profile:", error);
  }
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

// Subscribe to tasks in a list (real-time updates)
export function subscribeToListTasks(listId: string, onChange: () => void) {
  return supabase
    .channel(`tasks-${listId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: `task_list_id=eq.${listId}`,
      },
      () => onChange()
    )
    .subscribe();
}

// Subscribe to list members (real-time updates when someone is added/removed)
export function subscribeToListMembers(listId: string, onChange: () => void) {
  return supabase
    .channel(`members-${listId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "task_list_members",
        filter: `task_list_id=eq.${listId}`,
      },
      () => onChange()
    )
    .subscribe();
}
```

---

## Part 3: React Components

### Component 1: TaskListSidebar.tsx

Create file: `app/components/TaskListSidebar.tsx`

```tsx
"use client";

import { useState } from "react";
import { TaskList } from "@/lib/taskService";

interface TaskListSidebarProps {
  ownedLists: TaskList[];
  sharedLists: TaskList[];
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
  onCreateList: (title: string, description: string) => void;
  onDeleteList: (listId: string) => void;
  isDark: boolean;
}

export default function TaskListSidebar({
  ownedLists,
  sharedLists,
  selectedListId,
  onSelectList,
  onCreateList,
  onDeleteList,
  isDark,
}: TaskListSidebarProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [newListDescription, setNewListDescription] = useState("");

  const handleCreate = () => {
    if (!newListTitle.trim()) {
      alert("List title cannot be empty");
      return;
    }
    onCreateList(newListTitle, newListDescription);
    setNewListTitle("");
    setNewListDescription("");
    setShowCreateForm(false);
  };

  const bgColor = isDark ? "bg-gray-800" : "bg-gray-50";
  const textColor = isDark ? "text-gray-100" : "text-gray-900";
  const hoverColor = isDark ? "hover:bg-gray-700" : "hover:bg-gray-100";
  const borderColor = isDark ? "border-gray-700" : "border-gray-200";
  const selectedColor = "bg-blue-500 text-white";

  return (
    <div className={`w-64 ${bgColor} p-4 border-r ${borderColor} min-h-screen`}>
      <h2 className={`text-lg font-bold mb-4 ${textColor}`}>Lists</h2>

      {/* All Tasks Button */}
      <button
        onClick={() => onSelectList(null)}
        className={`w-full text-left p-2 rounded mb-4 ${
          selectedListId === null ? selectedColor : `${textColor} ${hoverColor}`
        }`}
      >
        📌 All Tasks
      </button>

      {/* Owned Lists */}
      {ownedLists.length > 0 && (
        <div className="mb-6">
          <h3 className={`text-sm font-semibold ${textColor} mb-2`}>My Lists</h3>
          <div className="space-y-1">
            {ownedLists.map((list) => (
              <div
                key={list.id}
                className={`flex justify-between items-center p-2 rounded ${hoverColor} group`}
              >
                <button
                  onClick={() => onSelectList(list.id)}
                  className={`flex-1 text-left ${
                    selectedListId === list.id ? "font-bold text-blue-500" : textColor
                  }`}
                >
                  📝 {list.title}
                </button>
                <button
                  onClick={() => onDeleteList(list.id)}
                  className={`opacity-0 group-hover:opacity-100 text-red-500 text-sm px-1`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Lists */}
      {sharedLists.length > 0 && (
        <div className="mb-6">
          <h3 className={`text-sm font-semibold ${textColor} mb-2`}>Shared with Me</h3>
          <div className="space-y-1">
            {sharedLists.map((list) => (
              <button
                key={list.id}
                onClick={() => onSelectList(list.id)}
                className={`w-full text-left p-2 rounded ${
                  selectedListId === list.id ? selectedColor : `${textColor} ${hoverColor}`
                }`}
              >
                🔗 {list.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create List Form */}
      {showCreateForm ? (
        <div className={`p-3 rounded border ${borderColor}`}>
          <input
            type="text"
            placeholder="List name"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            className={`w-full p-2 border rounded mb-2 ${isDark ? "bg-gray-700 text-white border-gray-600" : ""}`}
          />
          <textarea
            placeholder="Description (optional)"
            value={newListDescription}
            onChange={(e) => setNewListDescription(e.target.value)}
            className={`w-full p-2 border rounded mb-2 text-sm ${isDark ? "bg-gray-700 text-white border-gray-600" : ""}`}
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 bg-blue-500 text-white p-2 rounded text-sm"
            >
              Add
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className={`flex-1 p-2 rounded text-sm ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-300"}`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full bg-blue-500 text-white p-2 rounded font-semibold"
        >
          + New List
        </button>
      )}
    </div>
  );
}
```

### Component 2: TaskListHeader.tsx

Create file: `app/components/TaskListHeader.tsx`

```tsx
"use client";

import { useState } from "react";
import { TaskList } from "@/lib/taskService";

interface TaskListHeaderProps {
  list: TaskList | null;
  onShare: (email: string) => void;
  onEdit: (title: string, description: string) => void;
  isDark: boolean;
}

export default function TaskListHeader({
  list,
  onShare,
  onEdit,
  isDark,
}: TaskListHeaderProps) {
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitle, setEditTitle] = useState(list?.title || "");
  const [editDescription, setEditDescription] = useState(list?.description || "");

  if (!list) {
    return (
      <div className={`p-6 border-b ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
          All Tasks
        </h1>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Tasks not in any list
        </p>
      </div>
    );
  }

  const handleShare = () => {
    if (!shareEmail.trim()) {
      alert("Please enter an email address");
      return;
    }
    onShare(shareEmail);
    setShareEmail("");
    setShowShareForm(false);
  };

  const handleEdit = () => {
    onEdit(editTitle, editDescription);
    setShowEditForm(false);
  };

  const textColor = isDark ? "text-gray-100" : "text-gray-900";
  const bgColor = isDark ? "bg-gray-800" : "bg-white";
  const borderColor = isDark ? "border-gray-700" : "border-gray-200";

  return (
    <div className={`p-6 border-b ${borderColor} ${bgColor}`}>
      {showEditForm ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className={`w-full text-2xl font-bold p-2 border rounded ${isDark ? "bg-gray-700 text-white border-gray-600" : ""}`}
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className={`w-full p-2 border rounded ${isDark ? "bg-gray-700 text-white border-gray-600" : ""}`}
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Save
            </button>
            <button
              onClick={() => setShowEditForm(false)}
              className={`px-4 py-2 rounded ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-300"}`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className={`text-3xl font-bold ${textColor}`}>{list.title}</h1>
              {list.description && (
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {list.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowEditForm(true)}
              className="px-3 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400"
            >
              ✎ Edit
            </button>
          </div>

          {/* Share & Collaboration */}
          {showShareForm ? (
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter email to share"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className={`flex-1 p-2 border rounded ${isDark ? "bg-gray-700 text-white border-gray-600" : ""}`}
              />
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Share
              </button>
              <button
                onClick={() => setShowShareForm(false)}
                className={`px-4 py-2 rounded ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-300"}`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowShareForm(true)}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              🔗 Share
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

---

## Part 4: Updated Dashboard Page

Create file: `app/dashboard/page.tsx` (replace existing):

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logoutUser } from "@/lib/auth";
import {
  fetchAllTaskLists,
  fetchSharedTaskLists,
  fetchTasksForUser,
  fetchTasksForList,
  createTask,
  createTaskList,
  updateTaskList,
  deleteTaskList,
  toggleTaskCompletion,
  deleteTask,
  shareListWithUserByEmail,
  Task,
  TaskList,
} from "@/lib/taskService";
import TaskListSidebar from "@/components/TaskListSidebar";
import TaskListHeader from "@/components/TaskListHeader";
import { supabase } from "@/lib/supabaseClient";

export default function Dashboard() {
  const router = useRouter();

  // State for tasks and lists
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ownedLists, setOwnedLists] = useState<TaskList[]>([]);
  const [sharedLists, setSharedLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // State for form inputs
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");

  // State for user and UI
  const [userId, setUserId] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load current user and lists on mount
  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      // Load both owned and shared lists
      const ownedData = await fetchAllTaskLists(user.id);
      const sharedData = await fetchSharedTaskLists(user.id);

      setOwnedLists(ownedData);
      setSharedLists(sharedData);

      // Load tasks for first list or all tasks
      if (ownedData.length > 0) {
        setSelectedListId(ownedData[0].id);
        await loadTasksForList(ownedData[0].id);
      } else {
        await loadTasksForUser(user.id);
      }

      setIsLoading(false);
    }

    loadData();
  }, [router]);

  // Load tasks for current user (no list)
  async function loadTasksForUser(uid: string) {
    const taskList = await fetchTasksForUser(uid);
    setTasks(taskList);
  }

  // Load tasks for specific list
  async function loadTasksForList(listId: string) {
    const taskList = await fetchTasksForList(listId);
    setTasks(taskList);
  }

  // Refresh tasks based on selected list
  async function refreshTasks() {
    if (selectedListId) {
      await loadTasksForList(selectedListId);
    } else {
      await loadTasksForUser(userId);
    }
  }

  // Create new task
  async function handleAddTask() {
    if (!newTaskTitle.trim()) {
      alert("Task title cannot be empty");
      return;
    }

    await createTask(
      userId,
      newTaskTitle,
      selectedListId || undefined,
      newTaskDueDate || undefined,
      newTaskPriority
    );

    setNewTaskTitle("");
    setNewTaskDueDate("");
    setNewTaskPriority("Medium");

    await refreshTasks();
  }

  // Create new list
  async function handleCreateList(title: string, description: string) {
    const newList = await createTaskList(userId, title, description);
    if (newList) {
      setOwnedLists([newList, ...ownedLists]);
    }
  }

  // Update list
  async function handleUpdateList(title: string, description: string) {
    if (selectedListId) {
      await updateTaskList(selectedListId, title, description);
      const updated = ownedLists.map((l) =>
        l.id === selectedListId ? { ...l, title, description } : l
      );
      setOwnedLists(updated);
    }
  }

  // Delete list
  async function handleDeleteList(listId: string) {
    if (confirm("Are you sure? This will delete all tasks in this list.")) {
      await deleteTaskList(listId);
      setOwnedLists(ownedLists.filter((l) => l.id !== listId));
      if (selectedListId === listId) {
        setSelectedListId(null);
        await loadTasksForUser(userId);
      }
    }
  }

  // Share list with user
  async function handleShareList(email: string) {
    if (!selectedListId) {
      alert("Please select a list to share");
      return;
    }

    const success = await shareListWithUserByEmail(selectedListId, email);
    if (success) {
      alert("List shared successfully!");
    } else {
      alert("Failed to share list. Check email address.");
    }
  }

  // Toggle task completion
  async function handleToggleTask(taskId: string, completed: boolean) {
    await toggleTaskCompletion(taskId, completed);
    await refreshTasks();
  }

  // Delete task
  async function handleDeleteTask(taskId: string) {
    if (confirm("Delete this task?")) {
      await deleteTask(taskId);
      await refreshTasks();
    }
  }

  // Logout
  async function handleLogout() {
    await logoutUser();
    router.push("/");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const bgColor = isDark ? "bg-gray-900" : "bg-gray-100";
  const textColor = isDark ? "text-white" : "text-gray-900";
  const borderColor = isDark ? "border-gray-700" : "border-gray-200";
  const inputBg = isDark ? "bg-gray-700 text-white border-gray-600" : "bg-white";

  const currentList = [...ownedLists, ...sharedLists].find((l) => l.id === selectedListId);

  return (
    <div className={`flex min-h-screen ${bgColor}`}>
      {/* Sidebar */}
      <TaskListSidebar
        ownedLists={ownedLists}
        sharedLists={sharedLists}
        selectedListId={selectedListId}
        onSelectList={(listId) => {
          setSelectedListId(listId);
          if (listId) {
            loadTasksForList(listId);
          } else {
            loadTasksForUser(userId);
          }
        }}
        onCreateList={handleCreateList}
        onDeleteList={handleDeleteList}
        isDark={isDark}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className={`flex justify-between items-center p-6 border-b ${borderColor} ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <h1 className={`text-2xl font-bold ${textColor}`}>QuickTask</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`px-4 py-2 rounded ${isDark ? "bg-gray-700 text-yellow-400" : "bg-gray-200 text-blue-600"}`}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        {/* List Header */}
        {currentList && (
          <TaskListHeader
            list={currentList}
            onShare={handleShareList}
            onEdit={handleUpdateList}
            isDark={isDark}
          />
        )}

        {/* Tasks Container */}
        <div className="flex-1 overflow-auto p-6">
          {/* Add Task Form */}
          <div className={`mb-6 p-4 rounded border ${borderColor} ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Add a new task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className={`w-full p-2 border rounded ${inputBg}`}
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className={`flex-1 p-2 border rounded ${inputBg}`}
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as "High" | "Medium" | "Low")}
                  className={`p-2 border rounded ${inputBg}`}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <button
                  onClick={handleAddTask}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                No tasks yet. Create one above!
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded border ${borderColor} ${
                    isDark ? "bg-gray-800" : "bg-white"
                  } flex justify-between items-start hover:shadow-md transition`}
                >
                  <div className="flex-1">
                    <div
                      onClick={() => handleToggleTask(task.id, task.completed)}
                      className={`cursor-pointer text-lg ${
                        task.completed ? "line-through text-gray-400" : textColor
                      }`}
                    >
                      {task.completed ? "✓ " : ""} {task.title}
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                      {task.due_date && (
                        <span className={isDark ? "text-gray-400" : "text-gray-600"}>
                          📅 {new Date(task.due_date).toLocaleDateString()}
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
                        🔴 {task.priority}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-500 hover:text-red-700 ml-4"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Part 5: Update Auth to Create User Profile

Update your `lib/auth.ts` file. Add this function:

```typescript
// At the top, add import
import { createUserProfile } from "./taskService";

// Update the registerUser function
export async function registerUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  
  if (error) {
    return { user: data.user, error };
  }

  // Create user profile after signup
  if (data.user) {
    await createUserProfile(data.user.id, email);
  }

  return { user: data.user, error };
}
```

---

## Part 6: API Routes (Optional but Recommended)

### Create file: `app/api/lists/route.ts`

```typescript
// app/api/lists/route.ts
// Backend API for task list operations

import { NextRequest, NextResponse } from "next/server";
import { fetchAllTaskLists, createTaskList, deleteTaskList } from "@/lib/taskService";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lists = await fetchAllTaskLists(user.id);
  return NextResponse.json(lists);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description } = body;

  const newList = await createTaskList(user.id, title, description);
  return NextResponse.json(newList);
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const listId = searchParams.get("id");

  if (!listId) {
    return NextResponse.json({ error: "Missing list ID" }, { status: 400 });
  }

  await deleteTaskList(listId);
  return NextResponse.json({ success: true });
}
```

### Create file: `app/api/tasks/route.ts`

```typescript
// app/api/tasks/route.ts
// Backend API for task operations

import { NextRequest, NextResponse } from "next/server";
import { fetchTasksForList, createTask, deleteTask } from "@/lib/taskService";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const listId = searchParams.get("listId");

  if (!listId) {
    return NextResponse.json({ error: "Missing list ID" }, { status: 400 });
  }

  const tasks = await fetchTasksForList(listId);
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, listId, dueDate, priority } = body;

  const newTask = await createTask(user.id, title, listId, dueDate, priority);
  return NextResponse.json(newTask);
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get("id");

  if (!taskId) {
    return NextResponse.json({ error: "Missing task ID" }, { status: 400 });
  }

  await deleteTask(taskId);
  return NextResponse.json({ success: true });
}
```

---

## Part 7: Final Project Structure

After implementation, your project should look like:

```
quicktask/
├── app/
│   ├── api/
│   │   ├── lists/
│   │   │   └── route.ts               (NEW)
│   │   └── tasks/
│   │       └── route.ts               (NEW)
│   ├── components/
│   │   ├── TaskListSidebar.tsx        (NEW)
│   │   └── TaskListHeader.tsx         (NEW)
│   ├── dashboard/
│   │   └── page.tsx                   (UPDATED)
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── favicon.ico
├── lib/
│   ├── auth.ts                        (UPDATED)
│   ├── supabaseClient.ts
│   └── taskService.ts                 (COMPLETE REWRITE)
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## Part 8: Implementation Order (Fastest to Finish)

Follow these steps in order:

### Step 1: Database Setup (30 minutes)
1. Copy all SQL from Part 1 above
2. Go to Supabase Dashboard → SQL Editor
3. Paste and run the SQL
4. Verify tables are created

### Step 2: Service Layer (30 minutes)
1. Replace content of `lib/taskService.ts` with Part 2 code
2. Run `npm run lint` to verify
3. Test by checking if it highlights errors

### Step 3: Components (1 hour)
1. Create `app/components/TaskListSidebar.tsx` with Part 3 code
2. Create `app/components/TaskListHeader.tsx` with Part 3 code
3. Run `npm run lint` to verify

### Step 4: Dashboard Update (1 hour)
1. Replace `app/dashboard/page.tsx` with Part 4 code
2. Update `lib/auth.ts` with the createUserProfile function from Part 5
3. Run `npm run dev` and test

### Step 5: API Routes (30 minutes)
1. Create `app/api/lists/route.ts` with Part 6 code
2. Create `app/api/tasks/route.ts` with Part 6 code
3. Run `npm run lint`

### Step 6: Testing & Refinement (1-2 hours)
1. Create a task list and verify it shows in sidebar
2. Add a task and verify it appears
3. Share a list with another email
4. Test dark mode
5. Test on mobile (resize browser)

---

## Quick Checklist

- [ ] Database tables created in Supabase
- [ ] `lib/taskService.ts` replaced with new code
- [ ] `app/components/TaskListSidebar.tsx` created
- [ ] `app/components/TaskListHeader.tsx` created
- [ ] `app/dashboard/page.tsx` updated
- [ ] `lib/auth.ts` updated with createUserProfile
- [ ] API routes created (optional)
- [ ] `npm run dev` works without errors
- [ ] Can create and view task lists
- [ ] Can add tasks to lists
- [ ] Dark mode works
- [ ] Sharing works

That's it! You now have a complete, multi-feature collaborative task app. 🚀
