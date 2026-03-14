# QuickTask - Simple Task Manager with Supabase

This is a beginner-friendly Next.js app that demonstrates authentication and database operations using **Supabase**. Firebase has been completely removed and replaced with Supabase equivalents.

## 🏗 Project Structure

The code is organized to separate concerns clearly:

- **`lib/supabaseClient.ts`** - Single Supabase client instance using environment variables.
- **`lib/auth.ts`** - Authentication helpers (register, login, logout, get current user).
- **`lib/taskService.ts`** - Database helpers for tasks (CRUD operations + realtime subscriptions).
- **`app/login/page.tsx`** - Login form.
- **`app/register/page.tsx`** - Registration form.
- **`app/dashboard/page.tsx`** - Task dashboard with realtime updates.

## 🗄 Database Tables

The app uses these Supabase tables:

- **`tasks`** - Stores individual tasks with columns: `id`, `title`, `completed`, `owner_id`, `created_at`.
- **`task_lists`** - (Optional) For grouping tasks.
- **`task_list_members`** - (Optional) For sharing lists.

Currently, the UI only interacts with `tasks`, but the schema supports expansion.

## 🚀 Getting Started

1. **Install dependencies** (Firebase is removed, so run this to clean up):
   ```bash
   npm install
   ```

2. **Set up environment variables**. Create `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000) and register/login to manage tasks.

## ✨ Features Implemented

- **User Registration** - Creates account with email/password, sends confirmation email.
- **User Login** - Signs in existing users.
- **Logout** - Signs out current user.
- **Create Task** - Adds new tasks to the database.
- **Update Task** - Toggles completion status.
- **Delete Task** - Removes tasks.
- **Fetch Tasks** - Loads tasks for the logged-in user.
- **Realtime Updates** - Tasks update automatically across sessions when changes occur.

## 💡 Code Explanation

Each module is small and focused:

- **Authentication Flow**: UI calls `loginUser()` → Supabase Auth → session stored → redirect.
- **Database Operations**: UI calls `addTaskForUser()` → Supabase query → data saved → realtime broadcast.
- **Realtime**: `subscribeToTasks()` listens for changes → calls `refreshTasks()` → UI updates.

This structure makes it easy to explain in interviews: "The component calls a helper, the helper talks to Supabase, and updates flow back via realtime."

## 📚 Learn More

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
