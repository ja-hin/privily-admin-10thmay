"use client";
import { useEffect, useState, FormEvent } from "react";
import AdminLayout from "@/components/AdminLayout";
import { api } from "@/lib/api";

interface Category {
  _id: string;
  title: string;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Category[]>("/category/getallcategory")
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setActioning(true);
    setError("");
    try {
      await api.post("/category/", { title: newTitle });
      const updated = await api.get<Category[]>("/category/getallcategory");
      setCategories(updated);
      setNewTitle("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActioning(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editTitle.trim()) return;
    setActioning(true);
    try {
      await api.put(`/category/${id}`, { title: editTitle });
      setCategories((prev) => prev.map((c) => c._id === id ? { ...c, title: editTitle } : c));
      setEditId(null);
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    setActioning(true);
    try {
      await api.delete(`/category/${id}`);
      setCategories((prev) => prev.filter((c) => c._id !== id));
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
          <p className="text-gray-500 text-sm mt-1">Pod categories like Desk, MeetingRoom, PrivateOffice</p>
        </div>

        {/* Create */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New Category</h3>
          {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. MeetingRoom"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={actioning || !newTitle.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
            >
              Add
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No categories yet</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {categories.map((c) => (
                <li key={c._id} className="px-5 py-4 flex items-center justify-between gap-4">
                  {editId === c._id ? (
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                  ) : (
                    <div>
                      <span className="font-medium text-gray-900">{c.title}</span>
                      <span className="text-xs text-gray-400 ml-3">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex gap-3 shrink-0">
                    {editId === c._id ? (
                      <>
                        <button onClick={() => handleUpdate(c._id)} disabled={actioning}
                          className="text-xs text-green-600 font-medium hover:underline">Save</button>
                        <button onClick={() => setEditId(null)}
                          className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditId(c._id); setEditTitle(c.title); }}
                          className="text-xs text-indigo-600 font-medium hover:underline">Edit</button>
                        <button onClick={() => handleDelete(c._id)} disabled={actioning}
                          className="text-xs text-red-500 font-medium hover:underline">Delete</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
