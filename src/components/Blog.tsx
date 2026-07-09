import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlogPost {
  id: number;
  title: string;
  body: string;
  mood: string | null;
  created_at: string;
  updated_at: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOKEN_KEY = "blog_session_token";
const EXCERPT_LENGTH = 320;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

function saveToken(t: string) {
  sessionStorage.setItem(TOKEN_KEY, t);
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`/api/blog${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return res;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NoteCard({
  post,
  onEdit,
  onDelete,
}: {
  post: BlogPost;
  onEdit: (p: BlogPost) => void;
  onDelete: (p: BlogPost) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const truncated = post.body.length > EXCERPT_LENGTH && !expanded;
  const displayBody = truncated ? post.body.slice(0, EXCERPT_LENGTH) : post.body;

  return (
    <article
      className="relative flex flex-col rounded-sm"
      style={{
        background: "var(--blog-note-bg)",
        border: "1px solid var(--blog-note-border)",
        boxShadow: "var(--blog-note-shadow)",
      }}
    >
      {/* Tape strip at top */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 rounded-sm opacity-70"
        style={{ background: "var(--blog-tape-bg)", border: "1px solid var(--blog-note-border)" }}
        aria-hidden
      />

      {/* Header bar */}
      <div
        className="flex items-start justify-between gap-2 px-5 pt-6 pb-3"
        style={{ borderBottom: "1px solid var(--blog-note-border)", background: "var(--blog-header-bg)" }}
      >
        <h2 className="text-base font-semibold leading-snug text-base-content flex-1 pr-2">
          {post.title}
        </h2>
        <div className="flex gap-1 shrink-0 mt-0.5">
          <button
            onClick={() => onEdit(post)}
            className="btn btn-ghost btn-xs opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Edit entry"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(post)}
            className="btn btn-ghost btn-xs opacity-50 hover:opacity-100 hover:text-error transition-opacity"
            aria-label="Delete entry"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex-1">
        <p className="text-sm text-base-content/80 leading-relaxed whitespace-pre-wrap">
          {displayBody}
          {truncated && "…"}
        </p>
        {post.body.length > EXCERPT_LENGTH && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-primary hover:underline focus:outline-none"
          >
            {expanded ? "show less ‹" : "read more ›"}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {post.mood && (
            <span className="text-xs text-base-content/50 italic">feeling: {post.mood}</span>
          )}
          <span className="text-xs text-base-content/40">{formatDateTime(post.created_at)}</span>
          {post.updated_at && (
            <span className="text-xs text-base-content/35 italic">
              edited {formatDateTime(post.updated_at)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Post form modal ──────────────────────────────────────────────────────────

function PostModal({
  post,
  onClose,
  onSave,
}: {
  post: BlogPost | null;
  onClose: () => void;
  onSave: (p: BlogPost) => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [mood, setMood] = useState(post?.mood ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(post ? `/posts/${post.id}` : "/posts", {
        method: post ? "PUT" : "POST",
        body: JSON.stringify({ title, body, mood: mood.trim() || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      const { post: saved } = await res.json();
      onSave(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-sm shadow-xl flex flex-col"
        style={{ background: "var(--blog-note-bg)", border: "1px solid var(--blog-note-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--blog-note-border)", background: "var(--blog-header-bg)" }}>
          <h3 className="font-semibold text-base-content">
            {post ? "edit entry" : "new entry"}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60 uppercase tracking-wide">title</label>
            <input
              ref={titleRef}
              className="input input-bordered w-full bg-base-100 text-sm"
              placeholder="what's on your mind?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60 uppercase tracking-wide">entry</label>
            <textarea
              className="textarea textarea-bordered w-full bg-base-100 text-sm leading-relaxed resize-none"
              placeholder="dear diary..."
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60 uppercase tracking-wide">mood <span className="normal-case">(optional)</span></label>
            <input
              className="input input-bordered w-full bg-base-100 text-sm"
              placeholder="e.g. nostalgic, cozy, reflective…"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              maxLength={60}
            />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-xs" /> : (post ? "save changes" : "post entry")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

function DeleteModal({
  post,
  onClose,
  onDeleted,
}: {
  post: BlogPost;
  onClose: () => void;
  onDeleted: (id: number) => void;
}) {
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setError("Password required."); return; }
    setDeleting(true);
    setError("");
    try {
      const res = await apiFetch(`/posts/${post.id}`, {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });
      if (res.status === 204) {
        onDeleted(post.id);
        return;
      }
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Delete failed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-sm shadow-xl"
        style={{ background: "var(--blog-note-bg)", border: "1px solid var(--blog-note-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--blog-note-border)", background: "var(--blog-header-bg)" }}>
          <h3 className="font-semibold text-base-content text-sm">delete entry</h3>
        </div>
        <form onSubmit={handleDelete} className="flex flex-col gap-4 px-5 py-5">
          <p className="text-sm text-base-content/70">
            Permanently delete <span className="font-medium text-base-content">"{post.title}"</span>? This cannot be undone.
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60 uppercase tracking-wide">confirm password</label>
            <input
              ref={inputRef}
              type="password"
              className="input input-bordered w-full bg-base-100 text-sm"
              placeholder="enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>cancel</button>
            <button type="submit" className="btn btn-error btn-sm" disabled={deleting}>
              {deleting ? <span className="loading loading-spinner loading-xs" /> : "delete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/blog/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 503) {
        setError("server not configured — set ADMIN_PASSWORD");
        return;
      }
      if (!res.ok) {
        setError("wrong password");
        return;
      }
      const { token } = await res.json();
      saveToken(token);
      onSuccess();
    } catch {
      setError("could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 px-4">
      <div
        className="relative w-full max-w-xs rounded-sm pt-10 pb-8 px-7 flex flex-col items-center gap-5"
        style={{
          background: "var(--blog-note-bg)",
          border: "1px solid var(--blog-note-border)",
          boxShadow: "var(--blog-note-shadow)",
        }}
      >
        {/* Tape */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 rounded-sm opacity-70"
          style={{ background: "var(--blog-tape-bg)", border: "1px solid var(--blog-note-border)" }}
          aria-hidden
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-base-content/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-base-content/50 tracking-widest uppercase">private</p>
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
          <input
            type="password"
            className="input input-bordered w-full bg-base-100 text-sm text-center"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-xs text-error text-center">{error}</p>}
          <button type="submit" className="btn btn-primary btn-sm w-full" disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : "enter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Blog() {
  const [authed, setAuthed] = useState(() => !!getToken());
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [showNewPost, setShowNewPost] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await apiFetch("/posts");
      if (res.status === 401) { clearToken(); setAuthed(false); return; }
      if (!res.ok) throw new Error("fetch failed");
      const { posts: data } = await res.json();
      setPosts(data);
    } catch {
      setFetchError("couldn't load entries — try refreshing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchPosts();
  }, [authed, fetchPosts]);

  function handleLogin() {
    setAuthed(true);
  }

  function handleLogout() {
    clearToken();
    setAuthed(false);
    setPosts([]);
  }

  function handleSaved(saved: BlogPost) {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setShowNewPost(false);
    setEditingPost(null);
  }

  function handleDeleted(id: number) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setDeletingPost(null);
  }

  return (
    <div className="container mx-auto w-full pt-4 overflow-x-hidden bg-base-100 rounded-md">
      <Navbar />
      <div className="mockup-window border bg-base-300">
        <div className="px-4 pt-4 pb-12">

          {!authed ? (
            <LoginScreen onSuccess={handleLogin} />
          ) : (
            <div className="max-w-xl mx-auto">

              {/* Page header */}
              <div className="flex items-baseline justify-between mb-8 mt-2">
                <div>
                  <h1 className="text-xl font-semibold text-base-content tracking-tight">journal</h1>
                  <p className="text-xs text-base-content/40 mt-0.5 tracking-wide">private entries</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-primary btn-sm gap-1.5"
                    onClick={() => setShowNewPost(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    new entry
                  </button>
                  <button
                    className="btn btn-ghost btn-xs text-base-content/30 hover:text-base-content/60"
                    onClick={handleLogout}
                    title="Lock"
                    aria-label="Lock and sign out"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Entry list */}
              {loading && (
                <div className="flex justify-center py-16">
                  <span className="loading loading-spinner loading-md text-primary" />
                </div>
              )}

              {!loading && fetchError && (
                <div className="text-center py-12 text-sm text-base-content/50">{fetchError}</div>
              )}

              {!loading && !fetchError && posts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-base-content/35">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <p className="text-sm">nothing yet — write your first entry</p>
                </div>
              )}

              {!loading && posts.length > 0 && (
                <div className="flex flex-col gap-10">
                  {posts.map((post) => (
                    <NoteCard
                      key={post.id}
                      post={post}
                      onEdit={setEditingPost}
                      onDelete={setDeletingPost}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />

      {/* Modals */}
      {(showNewPost || editingPost) && (
        <PostModal
          post={editingPost}
          onClose={() => { setShowNewPost(false); setEditingPost(null); }}
          onSave={handleSaved}
        />
      )}
      {deletingPost && (
        <DeleteModal
          post={deletingPost}
          onClose={() => setDeletingPost(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
