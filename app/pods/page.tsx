"use client";
import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { downloadCSV } from "@/lib/exportCsv";

const PORTAL_BASE = process.env.NEXT_PUBLIC_POD_BASE_URL || "http://localhost:3000/pod";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface Pod {
  _id: string; title: string; rate: number; description: string;
  isBlocked: boolean; isAvailable: boolean; totalRating: number;
  deviceId: string; serial: string; UserId: string; email: string; password?: string;
  timeSlot: string; availability: string; booking_requirements?: string;
  cancellation_policy?: string; safety_and_property?: string; direction?: string;
  location?: { _id: string; name: string; city: string };
  category?: { _id: string; title: string };
  features?: { _id: string; name: string; icon: string }[];
  images?: { url: string; public_id: string }[];
  createdAt: string;
}
interface Location { _id: string; name: string; city: string }
interface Category { _id: string; title: string }
interface Feature { _id: string; name: string; icon: string }

const emptyCreate = {
  UserId: "", deviceId: "", serial: "", password: "", title: "", description: "",
  locationId: "", categoryId: "", featureId: "", rate: "", booking_requirements: "",
  direction: "", availability: "", cancellation_policy: "",
  safety_and_property: "N/A", email: "", timeSlot: "1 hour",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";
const taCls = `${inputCls} resize-none`;

export default function PodsPage() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<Pod | null>(null);
  const [actioning, setActioning] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [qrPod, setQrPod] = useState<Pod | null>(null);

  // Edit
  const [editPod, setEditPod] = useState<Pod | null>(null);
  const [editForm, setEditForm] = useState({
    UserId: "", deviceId: "", serial: "", password: "",
    title: "", description: "", locationId: "", featureId: "",
    rate: "", timeSlot: "", availability: "", booking_requirements: "",
    cancellation_policy: "", safety_and_property: "", direction: "", email: "",
  });
  const [editImages, setEditImages] = useState<{ url: string; public_id: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [createImages, setCreateImages] = useState<{ url: string; public_id: string }[]>([]);
  const [creating, setCreating] = useState(false);

  // Dropdowns
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [uploading, setUploading] = useState(false);

  const createImgRef = useRef<HTMLInputElement>(null);
  const editImgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Pod[]>("/product/getall").then(setPods).catch(console.error).finally(() => setLoading(false));
    api.get<Location[]>("/admin/locations").then(setLocations).catch(console.error);
    api.get<Category[]>("/category").then(setCategories).catch(console.error);
    api.get<Feature[]>("/location/features").then(setAllFeatures).catch(console.error);
  }, []);

  async function uploadImages(files: FileList): Promise<{ url: string; public_id: string }[]> {
    const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
    const domain = BASE_URL.replace(/\/api$/, "");
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append("images", file));
      const res = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const d = await res.json();
        return (d.files as { url: string }[]).map((f) => ({
          url: f.url.startsWith("http") ? f.url : `${domain}${f.url}`,
          public_id: f.url,
        }));
      }
    } finally {
      setUploading(false);
    }
    return [];
  }

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
    setEditImages(pod.images || []);
    setEditForm({
      UserId: pod.UserId || "", deviceId: pod.deviceId || "",
      serial: pod.serial || "", password: pod.password || "",
      title: pod.title, description: pod.description,
      locationId: pod.location?._id || "", featureId: pod.features?.[0]?._id || "",
      rate: String(pod.rate), timeSlot: pod.timeSlot || "",
      availability: pod.availability || "",
      booking_requirements: pod.booking_requirements || "",
      cancellation_policy: pod.cancellation_policy || "",
      safety_and_property: pod.safety_and_property || "N/A",
      direction: pod.direction || "", email: pod.email || "",
    });
  }

  async function saveEdit() {
    if (!editPod) return;
    setSaving(true);
    try {
      const body = {
        UserId: editForm.UserId, deviceId: editForm.deviceId,
        serial: editForm.serial, email: editForm.email,
        password: editForm.password,
        title: editForm.title, description: editForm.description,
        rate: parseFloat(editForm.rate), timeSlot: editForm.timeSlot,
        availability: editForm.availability,
        booking_requirements: editForm.booking_requirements,
        cancellation_policy: editForm.cancellation_policy,
        safety_and_property: editForm.safety_and_property,
        direction: editForm.direction,
        location: editForm.locationId,
        features: editForm.featureId ? [editForm.featureId] : [],
        images: editImages,
      };
      await api.put<Pod>(`/product/${editPod._id}`, body);
      setPods((prev) => prev.map((p) => p._id === editPod._id ? { ...p, ...body as unknown as Pod } : p));
      if (selected?._id === editPod._id) setSelected((p) => p ? { ...p, ...body as unknown as Pod } : null);
      setEditPod(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function createPod() {
    setCreating(true);
    try {
      const slug = createForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const body = {
        slug, title: createForm.title, deviceId: createForm.deviceId,
        serial: createForm.serial, email: createForm.email, password: createForm.password,
        rate: parseFloat(createForm.rate), timeSlot: createForm.timeSlot,
        availability: createForm.availability, description: createForm.description,
        direction: createForm.direction,
        booking_requirements: createForm.booking_requirements,
        cancellation_policy: createForm.cancellation_policy,
        safety_and_property: createForm.safety_and_property || "N/A",
        location: createForm.locationId,
        category: createForm.categoryId,
        features: createForm.featureId ? [createForm.featureId] : [],
        UserId: createForm.UserId, images: createImages,
      };
      const newPod = await api.post<Pod>("/product/create-pods", body);
      setPods((prev) => [newPod, ...prev]);
      setCreateOpen(false);
      setCreateForm(emptyCreate);
      setCreateImages([]);
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
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

  function exportCSV() {
    const rows = filtered.map((p) => ({
      "Serial": p.serial || "—", "Title": p.title,
      "Location": p.location?.name || "—", "City": p.location?.city || "—",
      "Category": p.category?.title || "—", "Rate (R/hr)": p.rate,
      "Device ID": p.deviceId || "—", "Rating": p.totalRating || "—",
      "Status": p.isBlocked ? "Blocked" : "Active",
    }));
    downloadCSV(`pods-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pods</h2>
            <p className="text-gray-500 text-sm mt-1">{pods.length} total pods</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
              ⬇ Export CSV
            </button>
            <button type="button" onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create Pod
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
          <input type="text" aria-label="Search pods" placeholder="Search by title, location, serial, device ID…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-80" />
          <select title="Filter by status" aria-label="Filter by status" value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
                    {["Pod","Location","Category","Rate","Device S/N","Device ID","Rating","Status","Action"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
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
                            <img src={pod.images[0].url} alt={pod.title}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                              onError={() => setImgErrors((e) => ({ ...e, [pod._id]: true }))} />
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
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{pod.serial || "—"}</span></td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{pod.deviceId || "—"}</span></td>
                      <td className="px-4 py-3 text-yellow-600">{Number(pod.totalRating) > 0 ? `⭐ ${Number(pod.totalRating).toFixed(1)}` : "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={pod.isBlocked ? "blocked" : "active"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setSelected(pod)} title="View"
                            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          <button type="button" onClick={() => openEdit(pod)} title="Edit"
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button type="button" onClick={() => setQrPod(pod)} title="QR Code"
                            className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>
                          </button>
                          <button type="button" onClick={() => toggleBlock(pod)} disabled={actioning} title={pod.isBlocked ? "Unblock" : "Block"}
                            className={`p-1.5 rounded-lg transition-colors ${pod.isBlocked ? "text-emerald-500 hover:bg-emerald-50" : "text-red-400 hover:bg-red-50"}`}>
                            {pod.isBlocked ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── QR Modal ── */}
      {qrPod && (() => {
        const podUrl = `${PORTAL_BASE}/${qrPod._id}`;
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(podUrl)}`;
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div><h3 className="font-bold text-gray-900">QR Code</h3><p className="text-xs text-gray-400 mt-0.5">{qrPod.title}</p></div>
                <button type="button" onClick={() => setQrPod(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>
              <div className="p-6 flex flex-col items-center gap-4">
                <img src={qrSrc} alt="QR Code" className="w-52 h-52 rounded-xl border border-gray-100" />
                <p className="text-xs text-gray-400 text-center break-all">{podUrl}</p>
                <a href={qrSrc} download={`qr-${qrPod._id}.png`}
                  className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">Download QR</a>
                <a href={podUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full text-center border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-xl transition-colors">Preview Pod Page</a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Pod Detail Modal ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div><h3 className="font-bold text-gray-900">{selected.title}</h3><p className="text-xs text-gray-400 mt-0.5">{selected._id}</p></div>
              <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            {selected.images && selected.images.length > 0 && (
              <div className="flex gap-2 p-4 overflow-x-auto bg-gray-50">
                {selected.images.map((img, i) => (
                  <img key={i} src={img.url} alt={`${selected.title} ${i + 1}`}
                    className="h-40 w-auto rounded-lg object-cover shrink-0" />
                ))}
              </div>
            )}
            <div className="p-6 space-y-5">
              <p className="text-sm text-gray-600 leading-relaxed">{selected.description}</p>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Device Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400">Serial</p><p className="font-mono font-medium text-gray-800 mt-0.5">{selected.serial || "—"}</p></div>
                  <div><p className="text-xs text-gray-400">Device ID</p><p className="font-mono font-medium text-gray-800 mt-0.5">{selected.deviceId || "—"}</p></div>
                  <div><p className="text-xs text-gray-400">User ID</p><p className="font-mono font-medium text-gray-800 mt-0.5">{selected.UserId || "—"}</p></div>
                  <div><p className="text-xs text-gray-400">Email</p><p className="font-medium text-gray-800 mt-0.5">{selected.email || "—"}</p></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Rate</p><p className="font-medium mt-0.5">R {selected.rate}/hr</p></div>
                <div><p className="text-xs text-gray-400">Category</p><p className="font-medium mt-0.5">{selected.category?.title || "—"}</p></div>
                <div><p className="text-xs text-gray-400">Location</p><p className="font-medium mt-0.5">{selected.location?.name}, {selected.location?.city}</p></div>
                <div><p className="text-xs text-gray-400">Time Slot</p><p className="font-medium mt-0.5">{selected.timeSlot}</p></div>
                <div><p className="text-xs text-gray-400">Availability</p><p className="font-medium mt-0.5">{selected.availability}</p></div>
                <div><p className="text-xs text-gray-400">Rating</p><p className="font-medium mt-0.5">{Number(selected.totalRating) > 0 ? `⭐ ${Number(selected.totalRating).toFixed(1)}` : "No ratings"}</p></div>
              </div>
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
              {selected.booking_requirements && <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Booking Requirements</p><p className="text-sm text-gray-600">{selected.booking_requirements}</p></div>}
              {selected.cancellation_policy && <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Cancellation Policy</p><p className="text-sm text-gray-600">{selected.cancellation_policy}</p></div>}
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

      {/* ── Edit Modal ── */}
      {editPod && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Edit Pod</h3>
              <button type="button" onClick={() => setEditPod(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Row 1: User ID, Device ID, Device Serial */}
              <div className="grid grid-cols-3 gap-3">
                <input type="text" title="User ID" placeholder="User ID *" value={editForm.UserId}
                  onChange={(e) => setEditForm((f) => ({ ...f, UserId: e.target.value }))} className={inputCls} />
                <input type="text" title="Device ID" placeholder="Device ID *" value={editForm.deviceId}
                  onChange={(e) => setEditForm((f) => ({ ...f, deviceId: e.target.value }))} className={inputCls} />
                <input type="text" title="Device Serial" placeholder="Device Serial *" value={editForm.serial}
                  onChange={(e) => setEditForm((f) => ({ ...f, serial: e.target.value }))} className={inputCls} />
              </div>

              {/* Row 2: Device Password, Title, Description */}
              <div className="grid grid-cols-3 gap-3">
                <input type="password" title="Device Password" placeholder="Device Password (leave blank to keep)" value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} />
                <input type="text" title="Title" placeholder="Title *" value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
                <input type="text" title="Description" placeholder="Description *" value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
              </div>

              {/* Row 3: Select Location, Select Features */}
              <div className="grid grid-cols-2 gap-3">
                <select title="Select Location" value={editForm.locationId}
                  onChange={(e) => setEditForm((f) => ({ ...f, locationId: e.target.value }))}
                  className={`${inputCls} text-gray-700`}>
                  <option value="">Select Location</option>
                  {locations.map((l) => <option key={l._id} value={l._id}>{l.name} — {l.city}</option>)}
                </select>
                <select title="Select Features" value={editForm.featureId}
                  onChange={(e) => setEditForm((f) => ({ ...f, featureId: e.target.value }))}
                  className={`${inputCls} text-gray-700`}>
                  <option value="">Select Features</option>
                  {allFeatures.map((f) => <option key={f._id} value={f._id}>{f.icon} {f.name}</option>)}
                </select>
              </div>

              {/* Row 4: Images, Rate Per Min */}
              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <input ref={editImgRef} type="file" accept="image/*" multiple title="Upload images" className="hidden"
                    onChange={async (e) => {
                      if (!e.target.files?.length) return;
                      const uploaded = await uploadImages(e.target.files);
                      setEditImages((imgs) => [...imgs, ...uploaded]);
                      e.target.value = "";
                    }} />
                  {editImages.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {editImages.map((img, i) => (
                          <div key={i} className="relative group">
                            <img src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                            <button type="button" onClick={() => setEditImages((imgs) => imgs.filter((_, idx) => idx !== i))}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => editImgRef.current?.click()} disabled={uploading}
                        className="text-xs text-indigo-600 hover:underline disabled:opacity-50">
                        {uploading ? "Uploading…" : "+ Add more"}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => editImgRef.current?.click()} disabled={uploading}
                      className={`${inputCls} flex items-center gap-2 text-gray-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-500 transition-colors disabled:opacity-50`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {uploading ? "Uploading…" : "Choose files"}
                    </button>
                  )}
                </div>
                <input type="number" min="0" step="0.01" title="Rate Per Min" placeholder="Rate Per Min *" value={editForm.rate}
                  onChange={(e) => setEditForm((f) => ({ ...f, rate: e.target.value }))} className={inputCls} />
              </div>

              {/* Row 5: Booking Requirements, Google Maps Link */}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" title="Booking Requirements" placeholder="Booking Requirements" value={editForm.booking_requirements}
                  onChange={(e) => setEditForm((f) => ({ ...f, booking_requirements: e.target.value }))} className={inputCls} />
                <input type="text" title="Google Maps Link" placeholder="Google Maps Link" value={editForm.direction}
                  onChange={(e) => setEditForm((f) => ({ ...f, direction: e.target.value }))} className={inputCls} />
              </div>

              {/* Row 6: Availability, Time Slot, Cancellation Policy */}
              <div className="grid grid-cols-3 gap-3">
                <input type="text" title="Availability" placeholder="Availability" value={editForm.availability}
                  onChange={(e) => setEditForm((f) => ({ ...f, availability: e.target.value }))} className={inputCls} />
                <input type="text" title="Time Slot" placeholder="Time Slot (e.g. 1 hour)" value={editForm.timeSlot}
                  onChange={(e) => setEditForm((f) => ({ ...f, timeSlot: e.target.value }))} className={inputCls} />
                <input type="text" title="Cancellation Policy" placeholder="Cancellation Policy" value={editForm.cancellation_policy}
                  onChange={(e) => setEditForm((f) => ({ ...f, cancellation_policy: e.target.value }))} className={inputCls} />
              </div>

              {/* Row 7: Safety and Property, Host email */}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" title="Safety and Property" placeholder="Safety and Property" value={editForm.safety_and_property}
                  onChange={(e) => setEditForm((f) => ({ ...f, safety_and_property: e.target.value }))} className={inputCls} />
                <input type="email" title="Host email" placeholder="Host email" value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setEditPod(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={saveEdit} disabled={saving || uploading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 uppercase tracking-wide">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Pod Modal ── */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Create New Pod</h3>
              <button type="button" onClick={() => { setCreateOpen(false); setCreateForm(emptyCreate); setCreateImages([]); }}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Row 1: User ID, Device ID, Device Serial */}
              <div className="grid grid-cols-3 gap-3">
                <input type="text" title="User ID" placeholder="User ID *" value={createForm.UserId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, UserId: e.target.value }))} className={inputCls} />
                <input type="text" title="Device ID" placeholder="Device ID *" value={createForm.deviceId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, deviceId: e.target.value }))} className={inputCls} />
                <input type="text" title="Device Serial" placeholder="Device Serial *" value={createForm.serial}
                  onChange={(e) => setCreateForm((f) => ({ ...f, serial: e.target.value }))} className={inputCls} />
              </div>

              {/* Row 2: Device Password, Title, Description */}
              <div className="grid grid-cols-3 gap-3">
                <input type="password" title="Device Password" placeholder="Device Password *" value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} />
                <input type="text" title="Title" placeholder="Title *" value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
                <input type="text" title="Description" placeholder="Description *" value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
              </div>

              {/* Row 3: Select Location, Select Category, Select Features */}
              <div className="grid grid-cols-3 gap-3">
                <select title="Select Location" value={createForm.locationId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, locationId: e.target.value }))}
                  className={`${inputCls} italic text-gray-500`}>
                  <option value="">Select Location</option>
                  {locations.map((l) => <option key={l._id} value={l._id} className="not-italic text-gray-900">{l.name} — {l.city}</option>)}
                </select>
                <select title="Select Category" value={createForm.categoryId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className={`${inputCls} italic text-gray-500`}>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c._id} value={c._id} className="not-italic text-gray-900">{c.title}</option>)}
                </select>
                <select title="Select Features" value={createForm.featureId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, featureId: e.target.value }))}
                  className={`${inputCls} italic text-gray-500`}>
                  <option value="">Select Features</option>
                  {allFeatures.map((f) => <option key={f._id} value={f._id} className="not-italic text-gray-900">{f.icon} {f.name}</option>)}
                </select>
              </div>

              {/* Row 4: Images upload, Rate Per Min */}
              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <input ref={createImgRef} type="file" accept="image/*" multiple title="Upload images" className="hidden"
                    onChange={async (e) => {
                      if (!e.target.files?.length) return;
                      const uploaded = await uploadImages(e.target.files);
                      setCreateImages((imgs) => [...imgs, ...uploaded]);
                      e.target.value = "";
                    }} />
                  {createImages.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {createImages.map((img, i) => (
                          <div key={i} className="relative group">
                            <img src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                            <button type="button" onClick={() => setCreateImages((imgs) => imgs.filter((_, idx) => idx !== i))}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => createImgRef.current?.click()} disabled={uploading}
                        className="text-xs text-indigo-600 hover:underline disabled:opacity-50">
                        {uploading ? "Uploading…" : "+ Add more"}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => createImgRef.current?.click()} disabled={uploading}
                      className={`${inputCls} flex items-center gap-2 text-gray-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-500 transition-colors disabled:opacity-50`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {uploading ? "Uploading…" : "Choose files"}
                    </button>
                  )}
                </div>
                <input type="number" min="0" step="0.01" title="Rate Per Min" placeholder="Rate Per Min *" value={createForm.rate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, rate: e.target.value }))} className={inputCls} />
              </div>

              {/* Row 5: Booking Requirements, Google Maps Link */}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" title="Booking Requirements" placeholder="Booking Requirements *" value={createForm.booking_requirements}
                  onChange={(e) => setCreateForm((f) => ({ ...f, booking_requirements: e.target.value }))} className={inputCls} />
                <input type="text" title="Google Maps Link" placeholder="Google Maps Link *" value={createForm.direction}
                  onChange={(e) => setCreateForm((f) => ({ ...f, direction: e.target.value }))} className={inputCls} />
              </div>

              {/* Row 6: Availability, Cancellation Policy */}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" title="Availability" placeholder="Availability *" value={createForm.availability}
                  onChange={(e) => setCreateForm((f) => ({ ...f, availability: e.target.value }))} className={inputCls} />
                <input type="text" title="Cancellation Policy" placeholder="Cancellation Policy *" value={createForm.cancellation_policy}
                  onChange={(e) => setCreateForm((f) => ({ ...f, cancellation_policy: e.target.value }))} className={inputCls} />
              </div>

              {/* Row 7: Safety and Property, Host email */}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" title="Safety and Property" placeholder="Safety and Property *" value={createForm.safety_and_property}
                  onChange={(e) => setCreateForm((f) => ({ ...f, safety_and_property: e.target.value }))} className={inputCls} />
                <input type="email" title="Host email" placeholder="Host email *" value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setCreateOpen(false); setCreateForm(emptyCreate); setCreateImages([]); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={createPod} disabled={creating || uploading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 uppercase tracking-wide">
                  {creating ? "Creating…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
