"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";

const PORTAL_BASE =
  typeof window !== "undefined"
    ? `${window.location.origin}/pod`
    : "http://localhost:3000/pod";

interface Pod {
  _id: string;
  title: string;
  rate: number;
  description: string;
  isBlocked: boolean;
  isAvailable: boolean;
  totalRating: number;
  deviceId: string;
  serial: string;
  UserId: string;
  email: string;
  timeSlot: string;
  availability: string;
  booking_requirements?: string;
  cancellation_policy?: string;
  direction?: string;
  location?: { _id: string; name: string; city: string };
  category?: { _id: string; title: string };
  features?: { _id: string; name: string; icon: string }[];
  images?: { url: string; public_id: string }[];
  createdAt: string;
}

export default function PodsPage() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<Pod | null>(null);
  const [actioning, setActioning] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [qrPod, setQrPod]     = useState<Pod | null>(null);
  const [editPod, setEditPod] = useState<Pod | null>(null);
  const [editForm, setEditForm] = useState({
    title: "", description: "", rate: "", timeSlot: "",
    availability: "", booking_requirements: "", cancellation_policy: "", direction: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Pod[]>("/product/getall")
      .then(setPods)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function toggleBlock(pod: Pod) {
    if (!confirm(`${pod.isBlocked ? "Unblock" : "Block"} "${pod.title}"?`)) return;
    setActioning(true);
    try {
      const endpoint = pod.isBlocked ? `/product/unblock-pods/${pod._id}` : `/product/block-pods/${pod._id}`;
      await api.put(endpoint);
      setPods((prev) => prev.map((p) => p._id === pod._id ? { ...p, isBlocked: !p.isBlocked } : p));
      if (selected?._id === pod._id) setSelected((p) => p ? { ...p, isBlocked: !p.isBlocked } : null);
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  }

  function openEdit(pod: Pod) {
    setEditPod(pod);
    setEditForm({
      title: pod.title,
      description: pod.description,
      rate: String(pod.rate),
      timeSlot: pod.timeSlot,
      availability: pod.availability,
      booking_requirements: pod.booking_requirements || "",
      cancellation_policy: pod.cancellation_policy || "",
      direction: pod.direction || "",
    });
  }

  async function saveEdit() {
    if (!editPod) return;
    setSaving(true);
    try {
      const body = {
        title: editForm.title,
        description: editForm.description,
        rate: parseFloat(editForm.rate),
        timeSlot: editForm.timeSlot,
        availability: editForm.availability,
        booking_requirements: editForm.booking_requirements,
        cancellation_policy: editForm.cancellation_policy,
        direction: editForm.direction,
      };
      const updated = await api.put<Pod>(`/product/${editPod._id}`, body);
      setPods((prev) => prev.map((p) => p._id === editPod._id ? { ...p, ...body } : p));
      if (selected?._id === editPod._id) setSelected((p) => p ? { ...p, ...body } : null);
      setEditPod(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  const filtered = pods.filter((p) => {
    const matchSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.name.toLowerCase().includes(search.toLowerCase()) ||
      p.serial?.toLowerCase().includes(search.toLowerCase()) ||
      p.deviceId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || (filterStatus === "active" ? !p.isBlocked : p.isBlocked);
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pods</h2>
          <p className="text-gray-500 text-sm mt-1">{pods.length} total pods</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
          <input
            type="text"
            aria-label="Search pods"
            placeholder="Search by title, location, serial, device ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-80"
          />
          <select
            title="Filter by status"
            aria-label="Filter by status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading pods…</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pod</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Device S/N</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Device ID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">No pods found</td></tr>
                  ) : filtered.map((pod) => (
                    <tr key={pod._id} className={`hover:bg-gray-50 ${pod.isBlocked ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {pod.images?.[0] && !imgErrors[pod._id] ? (
                            <img
                              src={pod.images[0].url}
                              alt={pod.title}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                              onError={() => setImgErrors((e) => ({ ...e, [pod._id]: true }))}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">🏢</div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{pod.title}</p>
                            <p className="text-xs text-gray-400">{pod.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{pod.location?.name || "—"}</div>
                        <div className="text-xs text-gray-400">{pod.location?.city}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{pod.category?.title || "—"}</td>
                      <td className="px-4 py-3 font-medium text-indigo-600">R {pod.rate}/hr</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{pod.serial || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{pod.deviceId || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-yellow-600">
                        {Number(pod.totalRating) > 0 ? `⭐ ${Number(pod.totalRating).toFixed(1)}` : "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={pod.isBlocked ? "blocked" : "active"} /></td>
                      <td className="px-4 py-3 flex gap-3">
                        <button type="button" onClick={() => setSelected(pod)}
                          className="text-indigo-600 hover:underline text-xs font-medium">View</button>
                        <button type="button" onClick={() => openEdit(pod)}
                          className="text-amber-600 hover:underline text-xs font-medium">Edit</button>
                        <button type="button" onClick={() => setQrPod(pod)}
                          className="text-purple-600 hover:underline text-xs font-medium">QR</button>
                        <button type="button" onClick={() => toggleBlock(pod)} disabled={actioning}
                          className={`text-xs font-medium hover:underline ${pod.isBlocked ? "text-green-600" : "text-red-500"}`}>
                          {pod.isBlocked ? "Unblock" : "Block"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrPod && (() => {
        const podUrl = `${PORTAL_BASE}/${qrPod._id}`;
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(podUrl)}`;
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">QR Code</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{qrPod.title}</p>
                </div>
                <button type="button" onClick={() => setQrPod(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>
              <div className="p-6 flex flex-col items-center gap-4">
                <img src={qrSrc} alt="QR Code" className="w-52 h-52 rounded-xl border border-gray-100" />
                <p className="text-xs text-gray-400 text-center break-all">{podUrl}</p>
                <a
                  href={qrSrc}
                  download={`qr-${qrPod._id}.png`}
                  className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  Download QR
                </a>
                <a
                  href={podUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  Preview Pod Page
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pod Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{selected.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selected._id}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            {/* Images */}
            {selected.images && selected.images.length > 0 && !imgErrors[selected._id] && (
              <div className="flex gap-2 p-4 overflow-x-auto bg-gray-50">
                {selected.images.map((img, i) => (
                  <img
                    key={i}
                    src={img.url}
                    alt={`${selected.title} ${i + 1}`}
                    className="h-40 w-auto rounded-lg object-cover shrink-0"
                    onError={() => setImgErrors((e) => ({ ...e, [selected._id]: true }))}
                  />
                ))}
              </div>
            )}

            <div className="p-6 space-y-5">
              <div>
                <p className="text-sm text-gray-600 leading-relaxed">{selected.description}</p>
              </div>

              {/* Device Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Device Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Device S/N (serial)</p>
                    <p className="font-mono font-medium text-gray-800 mt-0.5">{selected.serial || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Device ID</p>
                    <p className="font-mono font-medium text-gray-800 mt-0.5">{selected.deviceId || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Device User ID</p>
                    <p className="font-mono font-medium text-gray-800 mt-0.5">{selected.UserId || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Pod Email</p>
                    <p className="font-medium text-gray-800 mt-0.5">{selected.email || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Pod Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Rate</p><p className="font-medium mt-0.5">R {selected.rate}/hr</p></div>
                <div><p className="text-xs text-gray-400">Category</p><p className="font-medium mt-0.5">{selected.category?.title || "—"}</p></div>
                <div><p className="text-xs text-gray-400">Location</p><p className="font-medium mt-0.5">{selected.location?.name}, {selected.location?.city}</p></div>
                <div><p className="text-xs text-gray-400">Time Slot</p><p className="font-medium mt-0.5">{selected.timeSlot}</p></div>
                <div><p className="text-xs text-gray-400">Availability</p><p className="font-medium mt-0.5">{selected.availability}</p></div>
                <div><p className="text-xs text-gray-400">Rating</p><p className="font-medium mt-0.5">{Number(selected.totalRating) > 0 ? `⭐ ${Number(selected.totalRating).toFixed(1)}` : "No ratings"}</p></div>
              </div>

              {/* Features */}
              {selected.features && selected.features.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.features.map((f) => (
                      <span key={f._id} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">{f.icon} {f.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Policies */}
              {selected.booking_requirements && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Booking Requirements</p>
                  <p className="text-sm text-gray-600">{selected.booking_requirements}</p>
                </div>
              )}
              {selected.cancellation_policy && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Cancellation Policy</p>
                  <p className="text-sm text-gray-600">{selected.cancellation_policy}</p>
                </div>
              )}

              {/* Action */}
              <div className="border-t border-gray-100 pt-4">
                <button type="button" onClick={() => toggleBlock(selected)} disabled={actioning}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${selected.isBlocked ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}>
                  {selected.isBlocked ? "Unblock Pod" : "Block Pod"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pod Edit Modal */}
      {editPod && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Edit Pod</h3>
              <button type="button" onClick={() => setEditPod(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Title</label>
                <input type="text" title="Pod title" placeholder="Pod title" value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              {/* Rate */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Rate (R / min)</label>
                <input type="number" min="0" step="0.01" title="Rate per minute" placeholder="e.g. 1.00" value={editForm.rate}
                  onChange={(e) => setEditForm((f) => ({ ...f, rate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              {/* Time Slot + Availability */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Time Slot</label>
                  <input type="text" title="Time slot" placeholder="e.g. 1 hour" value={editForm.timeSlot}
                    onChange={(e) => setEditForm((f) => ({ ...f, timeSlot: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Availability</label>
                  <input type="text" title="Availability" placeholder="e.g. Mon–Fri" value={editForm.availability}
                    onChange={(e) => setEditForm((f) => ({ ...f, availability: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                <textarea rows={3} title="Description" placeholder="Pod description" value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>

              {/* Booking Requirements */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Booking Requirements</label>
                <textarea rows={2} title="Booking requirements" placeholder="Any requirements to book this pod" value={editForm.booking_requirements}
                  onChange={(e) => setEditForm((f) => ({ ...f, booking_requirements: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>

              {/* Cancellation Policy */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cancellation Policy</label>
                <textarea rows={2} title="Cancellation policy" placeholder="Cancellation terms" value={editForm.cancellation_policy}
                  onChange={(e) => setEditForm((f) => ({ ...f, cancellation_policy: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>

              {/* Direction */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Direction URL</label>
                <input type="text" title="Direction URL" placeholder="https://maps.google.com/..." value={editForm.direction}
                  onChange={(e) => setEditForm((f) => ({ ...f, direction: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditPod(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={saveEdit} disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
