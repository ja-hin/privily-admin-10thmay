"use client";
import { useEffect, useState, FormEvent } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";

interface Feature {
  _id: string;
  name: string;
  icon: string;
  order: number;
  isBlocked: boolean;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "", order: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Feature[]>("/location/features")
      .then((data) => setFeatures(data.sort((a, b) => a.order - b.order)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.icon) { setError("Name and icon are required"); return; }
    setActioning(true);
    setError("");
    try {
      await api.post("/location/create-features", form);
      const updated = await api.get<Feature[]>("/location/features");
      setFeatures(updated.sort((a, b) => a.order - b.order));
      setForm({ name: "", icon: "", order: 0 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActioning(false);
    }
  }

  async function toggleBlock(f: Feature) {
    setActioning(true);
    try {
      const endpoint = f.isBlocked ? `/location/unblock-feature/${f._id}` : `/location/block-feature/${f._id}`;
      await api.put(endpoint);
      setFeatures((prev) => prev.map((feat) => feat._id === f._id ? { ...feat, isBlocked: !feat.isBlocked } : feat));
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this feature?")) return;
    setActioning(true);
    try {
      await api.delete(`/location/delete-feature/${id}`);
      setFeatures((prev) => prev.filter((f) => f._id !== id));
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Features / Amenities</h2>
          <p className="text-gray-500 text-sm mt-1">Manage pod amenities shown to users</p>
        </div>

        {/* Create Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New Feature</h3>
          {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-3 gap-3">
            <input
              placeholder="Feature name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              placeholder="Icon (emoji)"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              placeholder="Order"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={actioning}
              className="col-span-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
            >
              Add Feature
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading...</div>
          ) : features.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No features yet</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {features.map((f) => (
                <li key={f._id} className={`px-5 py-4 flex items-center justify-between ${f.isBlocked ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{f.icon}</span>
                    <div>
                      <span className="font-medium text-gray-900">{f.name}</span>
                      <span className="text-xs text-gray-400 ml-2">Order: {f.order}</span>
                    </div>
                    <StatusBadge status={f.isBlocked ? "blocked" : "active"} />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleBlock(f)}
                      disabled={actioning}
                      className={`text-xs font-medium hover:underline ${f.isBlocked ? "text-green-600" : "text-orange-500"}`}
                    >
                      {f.isBlocked ? "Unblock" : "Block"}
                    </button>
                    <button
                      onClick={() => handleDelete(f._id)}
                      disabled={actioning}
                      className="text-xs text-red-500 font-medium hover:underline"
                    >
                      Delete
                    </button>
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
