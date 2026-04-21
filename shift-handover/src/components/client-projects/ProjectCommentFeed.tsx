"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Edit2, Trash2, Check, X, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Comment {
  id: string;
  content: string;
  editedAt: string | null;
  createdAt: string;
  author: { id: string; name: string };
}

interface Props {
  clientId: string;
  currentUserId: string;
  currentUserRole: string;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 uppercase">
      {initials}
    </div>
  );
}

export default function ProjectCommentFeed({ clientId, currentUserId, currentUserRole }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/client-projects/${clientId}/comments`)
      .then((r) => r.json())
      .then(setComments)
      .catch(() => {});
  }, [clientId]);

  async function postComment() {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/client-projects/${clientId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setComments((prev) => [...prev, created]);
        setNewComment("");
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } finally {
      setPosting(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/client-projects/${clientId}/comments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
        setEditingId(null);
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteComment(id: string) {
    if (!confirm("Delete this comment?")) return;
    const res = await fetch(`/api/client-projects/${clientId}/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gray-400" />
        <h3 className="font-semibold text-gray-900">Activity &amp; Comments</h3>
        <span className="ml-auto text-xs text-gray-400">{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="divide-y divide-gray-50">
        {comments.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">No comments yet. Be the first to add one.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="px-5 py-4 flex gap-3">
            <Initials name={c.author.name} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{c.author.name}</span>
                <span className="text-xs text-gray-400">
                  {format(new Date(c.createdAt), "MMM d, yyyy h:mm a")}
                  {c.editedAt && <span className="italic ml-1">(edited)</span>}
                </span>
                {(c.author.id === currentUserId || currentUserRole === "ADMIN") && editingId !== c.id && (
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => { setEditingId(c.id); setEditContent(c.content); }} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteComment(c.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {editingId === c.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-y"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(c.id)} disabled={savingEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-60">
                      {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 py-4 border-t border-gray-100">
        <div className="flex gap-3">
          <Initials name="You" />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) postComment(); }}
              rows={2}
              placeholder="Write a comment... (Ctrl+Enter to submit)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={postComment}
                disabled={posting || !newComment.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
