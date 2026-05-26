"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";

interface Location {
  _id: string;
  name: string;
  Street: string;
  city: string;
  state: string;
  country_code: string;
  zip: string;
  latitude: number;
  longitude: number;
  isBlocked: boolean;
  rate?: number;
  images?: { url: string; public_id: string };
  booking?: string[];
}

const emptyForm = {
  name: "", Street: "", city: "", state: "", country_code: "", zip: "", latitude: "", longitude: "",
};

export default function LocationsPage() {
  const [locations, setLocations]   = useState<Location[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Location | null>(null);
  const [editing, setEditing]       = useState(false);
  const [editRate, setEditRate]     = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [actioning, setActioning]   = useState(false);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [creating, setCreating]     = useState(false);

  // Edit (full location, separate from inline rate edit)
  const [editPod, setEditPod]       = useState<Location | null>(null);
  const [editForm, setEditForm]     = useState(emptyForm);
  const [saving, setSaving]         = useState(false);

  function openEditLocation(loc: Location) {
    setEditPod(loc);
    setEditForm({
      name: loc.name ?? "",
      Street: loc.Street ?? "",
      city: loc.city ?? "",
      state: loc.state ?? "",
      country_code: loc.country_code ?? "",
      zip: loc.zip ?? "",
      latitude: String(loc.latitude ?? ""),
      longitude: String(loc.longitude ?? ""),
    });
    setSelected(null);
  }

  async function saveLocation() {
    if (!editPod) return;
    setSaving(true);
    try {
      const body = {
        name: editForm.name,
        Street: editForm.Street,
        city: editForm.city,
        state: editForm.state,
        country_code: editForm.country_code,
        zip: editForm.zip,
        latitude: parseFloat(editForm.latitude) || 0,
        longitude: parseFloat(editForm.longitude) || 0,
      };
      await api.put(`/location/edit-location/${editPod._id}`, body);
      setLocations((prev) => prev.map((l) => l._id === editPod._id ? { ...l, ...body } : l));
      setEditPod(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function createLocation() {
    setCreating(true);
    try {
      const body = {
        name: createForm.name,
        Street: createForm.Street,
        city: createForm.city,
        state: createForm.state,
        country_code: createForm.country_code,
        zip: createForm.zip,
        latitude: parseFloat(createForm.latitude) || 0,
        longitude: parseFloat(createForm.longitude) || 0,
      };
      const res = await api.post<Location | { data: Location }>("/location/create", body);
      const newLoc = (res as { data: Location }).data ?? (res as Location);
      setLocations((prev) => [newLoc, ...prev]);
      setCreateOpen(false);
      setCreateForm(emptyForm);
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  }

  useEffect(() => {
    api.get<{ data: Location[] }>("/location/details")
      .then((res) => setLocations(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function openDetail(loc: Location) {
    setSelected(loc);
    setEditRate(String(loc.rate ?? ""));
    setEditing(false);
  }

  async function toggleBlock(loc: Location) {
    if (!confirm(`${loc.isBlocked ? "Unblock" : "Block"} "${loc.name}"?`)) return;
    setActioning(true);
    try {
      const endpoint = loc.isBlocked
        ? `/location/unblock-Location/${loc._id}`
        : `/location/block-Location/${loc._id}`;
      await api.put(endpoint);
      const updated = { ...loc, isBlocked: !loc.isBlocked };
      setLocations((prev) => prev.map((l) => l._id === loc._id ? updated : l));
      setSelected(updated);
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  }

  async function saveRate() {
    if (!selected) return;
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0) return;
    setSavingRate(true);
    try {
      await api.put<Location>(`/location/edit-location/${selected._id}`, {
        name: selected.name,
        Street: selected.Street,
        city: selected.city,
        state: selected.state,
        country_code: selected.country_code,
        zip: selected.zip,
        latitude: selected.latitude,
        longitude: selected.longitude,
        rate,
      });
      setLocations((prev) => prev.map((l) => l._id === selected._id ? { ...l, rate } : l));
      setSelected((s) => s ? { ...s, rate } : null);
      setEditing(false);
    } catch (e) { console.error(e); }
    finally { setSavingRate(false); }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Locations</h2>
            <p className="text-gray-500 text-sm mt-1">{locations.length} locations</p>
          </div>
          <button type="button" onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Location
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <div
                key={loc._id}
                onClick={() => openDetail(loc)}
                className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow ${loc.isBlocked ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{loc.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{loc.city}, {loc.country_code}</p>
                  </div>
                  <StatusBadge status={loc.isBlocked ? "blocked" : "active"} />
                </div>
                <p className="text-xs text-gray-400">{loc.Street}, {loc.zip}</p>
                <p className="text-xs text-gray-400 mt-1">📍 {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    {loc.booking?.length || 0} bookings
                  </span>
                  {loc.rate != null && loc.rate > 0 && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      R {loc.rate}/min
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Location Details</h3>
              <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            {selected.images?.url && (
              <img src={selected.images.url} alt={selected.name} className="w-full h-48 object-cover" />
            )}

            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-gray-900">{selected.name}</h4>
                <div className="mt-1"><StatusBadge status={selected.isBlocked ? "blocked" : "active"} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Street</span><p className="font-medium mt-0.5">{selected.Street}</p></div>
                <div><span className="text-gray-500">City</span><p className="font-medium mt-0.5">{selected.city}</p></div>
                <div><span className="text-gray-500">State</span><p className="font-medium mt-0.5">{selected.state}</p></div>
                <div><span className="text-gray-500">Country</span><p className="font-medium mt-0.5">{selected.country_code}</p></div>
                <div><span className="text-gray-500">ZIP</span><p className="font-medium mt-0.5">{selected.zip}</p></div>
                <div><span className="text-gray-500">Total Bookings</span><p className="font-medium mt-0.5">{selected.booking?.length || 0}</p></div>
                <div><span className="text-gray-500">Latitude</span><p className="font-medium mt-0.5">{selected.latitude}</p></div>
                <div><span className="text-gray-500">Longitude</span><p className="font-medium mt-0.5">{selected.longitude}</p></div>
              </div>

              {/* Location Rate */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-emerald-800">Location Rate (R / min)</p>
                  {!editing && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="e.g. 1.00"
                    />
                    <button
                      type="button"
                      onClick={saveRate}
                      disabled={savingRate}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                    >
                      {savingRate ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setEditRate(String(selected.rate ?? "")); }}
                      className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-emerald-700">
                    {selected.rate && selected.rate > 0 ? `R ${selected.rate}/min` : "Not set"}
                  </p>
                )}
              </div>

              <div className="pt-1 flex gap-3">
                <button
                  type="button"
                  onClick={() => openEditLocation(selected)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                >
                  Edit Location
                </button>
                <button
                  type="button"
                  onClick={() => toggleBlock(selected)}
                  disabled={actioning}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected.isBlocked
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {selected.isBlocked ? "Unblock" : "Block"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Location Modal ── */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Add New Location</h3>
              <button type="button" onClick={() => { setCreateOpen(false); setCreateForm(emptyForm); }}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              <input type="text" placeholder="Name *" value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input type="text" placeholder="Street *" value={createForm.Street}
                onChange={(e) => setCreateForm((f) => ({ ...f, Street: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="City *" value={createForm.city}
                  onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <input type="text" placeholder="State *" value={createForm.state}
                  onChange={(e) => setCreateForm((f) => ({ ...f, state: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Country Code (e.g. ZA) *" value={createForm.country_code}
                  onChange={(e) => setCreateForm((f) => ({ ...f, country_code: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <input type="text" placeholder="ZIP *" value={createForm.zip}
                  onChange={(e) => setCreateForm((f) => ({ ...f, zip: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.000001" placeholder="Latitude *" value={createForm.latitude}
                  onChange={(e) => setCreateForm((f) => ({ ...f, latitude: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <input type="number" step="0.000001" placeholder="Longitude *" value={createForm.longitude}
                  onChange={(e) => setCreateForm((f) => ({ ...f, longitude: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100 mt-3">
                <button type="button" onClick={() => { setCreateOpen(false); setCreateForm(emptyForm); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={createLocation} disabled={creating || !createForm.name.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Location Modal ── */}
      {editPod && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Edit Location</h3>
              <button type="button" onClick={() => setEditPod(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              <input type="text" placeholder="Name *" value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input type="text" placeholder="Street *" value={editForm.Street}
                onChange={(e) => setEditForm((f) => ({ ...f, Street: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="City *" value={editForm.city}
                  onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <input type="text" placeholder="State *" value={editForm.state}
                  onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Country Code *" value={editForm.country_code}
                  onChange={(e) => setEditForm((f) => ({ ...f, country_code: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <input type="text" placeholder="ZIP *" value={editForm.zip}
                  onChange={(e) => setEditForm((f) => ({ ...f, zip: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.000001" placeholder="Latitude *" value={editForm.latitude}
                  onChange={(e) => setEditForm((f) => ({ ...f, latitude: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <input type="number" step="0.000001" placeholder="Longitude *" value={editForm.longitude}
                  onChange={(e) => setEditForm((f) => ({ ...f, longitude: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100 mt-3">
                <button type="button" onClick={() => setEditPod(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={saveLocation} disabled={saving || !editForm.name.trim()}
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
