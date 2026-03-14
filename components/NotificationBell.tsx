"use client";

import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Notification = {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setNotifications((data as Notification[]) || []);
  }

  async function markAllAsRead() {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    fetchNotifications();
  }

  function subscribeRealtime() {
    supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();
  }

  useEffect(() => {
    fetchNotifications();
    subscribeRealtime();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell */}
      <button
        onClick={async () => {
          setOpen(!open);
          if (!open) await markAllAsRead();
        }}
        className="relative p-2 rounded-lg hover:bg-gray-100"
      >
        <Bell size={22} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white shadow-lg rounded-xl border">
          <div className="p-3 font-semibold border-b">Notifications</div>

          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No notifications</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="p-3 border-b hover:bg-gray-50 text-sm"
              >
                {n.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}