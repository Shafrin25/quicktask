"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link, Mail, Share2, Plus, X, MessageCircle } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";

function DroppableList({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`w-full rounded transition-all duration-200 ${
        isOver ? "ring-2 ring-blue-400 ring-inset scale-[1.02]" : ""
      }`}
    >
      {children}
    </div>
  );
}

export default function TaskListSidebar({
  selectedList,
  setSelectedList,
  isDark,
}: {
  selectedList: string | null;
  setSelectedList: (val: string | null) => void;
  isDark: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [lists, setLists] = useState<Array<{ id: string; title: string }>>([]);
  const [showSharePopup, setShowSharePopup] = useState(false);

  const loadLists = useCallback(async () => {
    const { data, error } = await supabase.from("task_lists").select("*");

    if (error) {
      console.error(error);
      return;
    }

    setLists(data || []);
      }, []);

  useEffect(() => {
    setMounted(true);
    loadLists();
  }, [loadLists]);

  async function createList() {
    if (!newListTitle.trim()) return;

    const { error } = await supabase
      .from("task_lists")
      .insert([{ title: newListTitle }]);

    if (error) {
      console.error(error);
      return;
    }

    setNewListTitle("");
    await loadLists();
  }

  function shareListLink() {
    if (!selectedList) {
      alert("Please select a list first");
      return;
    }

    if (typeof window !== "undefined") {
      const shareLink = `${window.location.origin}/dashboard?list=${selectedList}`;
      navigator.clipboard.writeText(shareLink);
      alert("Link copied! Share via WhatsApp or Email.");
    }
  }

  const shareUrl =
    mounted && typeof window !== "undefined"
      ? `${window.location.origin}/dashboard?list=${selectedList}`
      : "";

  return (
    <>
      <div
        className={`w-64 h-screen p-4 border-r overflow-y-auto ${
          isDark
            ? "bg-gray-800 text-white border-gray-700"
            : "bg-gray-50 text-gray-900 border-gray-200"
        }`}
      >
        <h2 className="text-lg font-bold mb-4">Task Lists</h2>
                {lists.length === 0 && (
          <p
            className={`text-sm ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            No lists yet
          </p>
        )}

        {lists.map((list) => (
          <DroppableList key={list.id} id={list.id}>
            <div
              onClick={() => setSelectedList(list.id)}
              className={`block w-full text-left p-2 mb-2 rounded cursor-pointer transition ${
                selectedList === list.id
                  ? isDark
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : isDark
                  ? "hover:bg-gray-700"
                  : "hover:bg-gray-200"
              }`}
            >
              {list.title}
            </div>
          </DroppableList>
        ))}

        <div className="mt-4 flex items-center gap-2 w-full">
          <input
  type="text"
  placeholder="New list"
  value={newListTitle}
  onChange={(e) => setNewListTitle(e.target.value)}
  className={`border rounded px-2 py-1 text-sm flex-1 min-w-0 ${
              isDark
                ? "bg-gray-700 text-white border-gray-600"
                : "bg-white text-gray-900 border-gray-300"
            }`}
          />

          <button
  onClick={createList}
  className="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1 flex-shrink-0"
>
            <Plus size={18} />
          </button>
        </div>
        <a
  href="/audit"
  className={`block w-full text-left p-2 mt-4 rounded transition ${
    isDark
      ? "hover:bg-gray-700 text-gray-300"
      : "hover:bg-gray-200 text-gray-700"
  }`}
>
  Audit Logs
</a>
                <button
          onClick={() => setShowSharePopup(true)}
          className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded mt-4 w-full transition"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>

      {showSharePopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div
            className={`p-6 rounded-xl w-80 ${
              isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
            }`}
          >
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-bold">Share List</h2>

              <button onClick={() => setShowSharePopup(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 text-center">
              <button onClick={shareListLink}>
                <Link size={24} />
                <p className="text-xs">Copy</p>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
                target="_blank"
              >
                <MessageCircle size={24} color="#25D366" />
                <p className="text-xs">WhatsApp</p>
              </a>

              <a
                href={`mailto:?subject=Shared Task List&body=${encodeURIComponent(
                  shareUrl
                )}`}
              >
                <Mail size={24} />
                <p className="text-xs">Email</p>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}