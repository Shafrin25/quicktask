"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Log = {
  id: string
  action: string
  created_at: string
  tasks: {
    title: string
  } | null
}

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([])

  async function loadLogs() {
  const { data, error } = await supabase
    .from("audit_logs")
    .select(`
      id,
      action,
      created_at,
      tasks:task_id (
        title
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Audit log error:", error);
    return;
  }

  if (data) setLogs(data as unknown as Log[]);
}

  useEffect(() => {
    loadLogs();
  }, []);

  return (
  <div className="flex justify-center min-h-screen bg-gray-100">

    <div className="w-full max-w-4xl p-6 bg-white rounded-lg shadow-lg">

      {/* Back Button */}
      <Link
        href="/dashboard"
        className="inline-block mb-4 text-blue-600 hover:underline"
      >
        ← Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-4 border rounded-lg bg-gray-50"
          >
            <p>
              <strong>Action:</strong> {log.action}
            </p>

            <p>
              <strong>Task:</strong> {log.tasks?.title || "Deleted Task"}
            </p>

            <p className="text-sm text-gray-500">
              {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

    </div>

  </div>
);
}