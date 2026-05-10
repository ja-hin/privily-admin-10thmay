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

export default function LocationsPage() {
  const [locations, setLocations]   = useState<Location[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Location | null>(null);
  const [editing, setEditing]       = useState(false);
  const [editRate, setEditRate]     = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [actioning, setActioning]   = useState(false);

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
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Locations</h2>
          <p className="text-gray-500 text-sm mt-1">{locations.length} locations</p>
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

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => toggleBlock(selected)}
                  disabled={actioning}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected.isBlocked
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {selected.isBlocked ? "Unblock Location" : "Block Location"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
