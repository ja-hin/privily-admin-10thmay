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

/* ── Countries list (code → name) ── */
const COUNTRIES: { code: string; name: string }[] = [
  { code: "ZA", name: "South Africa" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "ZM", name: "Zambia" },
  { code: "BW", name: "Botswana" },
  { code: "MZ", name: "Mozambique" },
  { code: "NA", name: "Namibia" },
  { code: "LS", name: "Lesotho" },
  { code: "SZ", name: "Eswatini" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "GH", name: "Ghana" },
  { code: "ET", name: "Ethiopia" },
  { code: "TZ", name: "Tanzania" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "UG", name: "Uganda" },
  { code: "CI", name: "Ivory Coast" },
  { code: "CM", name: "Cameroon" },
  { code: "SN", name: "Senegal" },
  { code: "AO", name: "Angola" },
  { code: "MU", name: "Mauritius" },
  { code: "RW", name: "Rwanda" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "BR", name: "Brazil" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "OTHER", name: "Other" },
];

/* ── Validation helpers ── */
function coordError(val: string, range: [number, number]): string {
  if (!val.trim()) return "";
  const num = parseFloat(val);
  if (isNaN(num)) return "Must be a valid number";
  if (num < range[0] || num > range[1]) return `Must be between ${range[0]} and ${range[1]}`;
  const dec = val.includes(".") ? val.split(".")[1].replace(/0+$/, "").length : 0;
  if (dec < 3) return "Needs at least 3 decimal places (e.g. -26.204)";
  return "";
}

const ZIP_RULES: Record<string, { pattern: RegExp; hint: string; placeholder: string }> = {
  ZA: { pattern: /^\d{4}$/,                          hint: "4 digits — e.g. 8001",             placeholder: "e.g. 8001"       },
  US: { pattern: /^\d{5}(-\d{4})?$/,                 hint: "5 digits or ZIP+4 — e.g. 10001",   placeholder: "e.g. 10001"      },
  GB: { pattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, hint: "UK postcode — e.g. SW1A 1AA",  placeholder: "e.g. SW1A 1AA"   },
  CA: { pattern: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,      hint: "A1A 1A1 format — e.g. M5H 2N2",    placeholder: "e.g. M5H 2N2"    },
  AU: { pattern: /^\d{4}$/,                          hint: "4 digits — e.g. 2000",             placeholder: "e.g. 2000"       },
  DE: { pattern: /^\d{5}$/,                          hint: "5 digits — e.g. 10115",            placeholder: "e.g. 10115"      },
  FR: { pattern: /^\d{5}$/,                          hint: "5 digits — e.g. 75001",            placeholder: "e.g. 75001"      },
  NL: { pattern: /^\d{4} ?[A-Z]{2}$/i,              hint: "4 digits + 2 letters — e.g. 1011 AB", placeholder: "e.g. 1011 AB" },
  IN: { pattern: /^\d{6}$/,                          hint: "6 digits — e.g. 400001",           placeholder: "e.g. 400001"     },
  AE: { pattern: /^\d{5,6}$/,                        hint: "5–6 digits — e.g. 12345",          placeholder: "e.g. 12345"      },
  SG: { pattern: /^\d{6}$/,                          hint: "6 digits — e.g. 018956",           placeholder: "e.g. 018956"     },
  NG: { pattern: /^\d{6}$/,                          hint: "6 digits — e.g. 100001",           placeholder: "e.g. 100001"     },
  KE: { pattern: /^\d{5}$/,                          hint: "5 digits — e.g. 00100",            placeholder: "e.g. 00100"      },
  ZW: { pattern: /^\d{4}$/,                          hint: "4 digits — e.g. 0001",             placeholder: "e.g. 0001"       },
  BW: { pattern: /^\d{4}$/,                          hint: "4 digits — e.g. 0000",             placeholder: "e.g. 0000"       },
};

function zipError(val: string, countryCode?: string): string {
  if (!val.trim()) return "";
  const rule = countryCode ? ZIP_RULES[countryCode] : undefined;
  if (rule) {
    if (!rule.pattern.test(val.trim()))
      return `Invalid format. Expected: ${rule.hint}`;
    return "";
  }
  if (!/^[A-Z0-9][A-Z0-9\s\-]{2,9}$/i.test(val.trim()))
    return "ZIP must be 3–10 alphanumeric characters";
  return "";
}

function zipHint(countryCode?: string): string {
  return countryCode ? (ZIP_RULES[countryCode]?.hint ?? "") : "";
}
function zipPlaceholder(countryCode?: string): string {
  return countryCode ? (ZIP_RULES[countryCode]?.placeholder ?? "Postal / ZIP code") : "Postal / ZIP code";
}

/* ── Reusable field components ── */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
    hasError ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-indigo-400"
  }`;
}

/* ── Location Form (shared by Create & Edit) ── */
function LocationForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  form: typeof emptyForm;
  onChange: (f: typeof emptyForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const latErr = coordError(form.latitude, [-90, 90]);
  const lonErr = coordError(form.longitude, [-180, 180]);
  const zpErr  = zipError(form.zip, form.country_code);
  const canSubmit = !submitting && form.name.trim() && !latErr && !lonErr && !zpErr;

  function set(key: keyof typeof emptyForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...form, [key]: e.target.value });
  }

  return (
    <div className="p-6 space-y-4">
      <Field label="Location Name *">
        <input type="text" placeholder="e.g. Hennos Park" value={form.name}
          onChange={set("name")} className={inputCls(false)} />
      </Field>

      <Field label="Street Address *">
        <input type="text" placeholder="e.g. 12 Main Street" value={form.Street}
          onChange={set("Street")} className={inputCls(false)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City *">
          <input type="text" placeholder="e.g. Cape Town" value={form.city}
            onChange={set("city")} className={inputCls(false)} />
        </Field>
        <Field label="State / Province *">
          <input type="text" placeholder="e.g. Western Cape" value={form.state}
            onChange={set("state")} className={inputCls(false)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Country *">
          <select value={form.country_code} onChange={set("country_code")} title="Select country" aria-label="Country" className={inputCls(false)}>
            <option value="">Select country…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </Field>
        <Field label="ZIP / Postal Code *" error={zpErr}>
          <input type="text" placeholder={zipPlaceholder(form.country_code)} value={form.zip}
            onChange={set("zip")} className={inputCls(!!zpErr)} />
          {!zpErr && zipHint(form.country_code) && (
            <p className="text-xs text-gray-400 mt-0.5">{zipHint(form.country_code)}</p>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude *" error={latErr}>
          <input type="text" placeholder="e.g. -33.924" value={form.latitude}
            onChange={set("latitude")} className={inputCls(!!latErr)} />
          <p className="text-xs text-gray-400 mt-0.5">Range: −90 to 90, min 3 decimals</p>
        </Field>
        <Field label="Longitude *" error={lonErr}>
          <input type="text" placeholder="e.g. 18.424" value={form.longitude}
            onChange={set("longitude")} className={inputCls(!!lonErr)} />
          <p className="text-xs text-gray-400 mt-0.5">Range: −180 to 180, min 3 decimals</p>
        </Field>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" onClick={onSubmit} disabled={!canSubmit}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function LocationsPage() {
  const [locations, setLocations]   = useState<Location[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Location | null>(null);
  const [editing, setEditing]       = useState(false);
  const [editRate, setEditRate]     = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [actioning, setActioning]   = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [creating, setCreating]     = useState(false);

  const [editPod, setEditPod]       = useState<Location | null>(null);
  const [editForm, setEditForm]     = useState(emptyForm);
  const [saving, setSaving]         = useState(false);

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
        name: editForm.name, Street: editForm.Street, city: editForm.city,
        state: editForm.state, country_code: editForm.country_code, zip: editForm.zip,
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
        name: createForm.name, Street: createForm.Street, city: createForm.city,
        state: createForm.state, country_code: createForm.country_code, zip: createForm.zip,
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

  async function toggleBlock(loc: Location) {
    if (!confirm(`${loc.isBlocked ? "Unblock" : "Block"} "${loc.name}"?`)) return;
    setActioning(true);
    try {
      await api.put(loc.isBlocked ? `/location/unblock-Location/${loc._id}` : `/location/block-Location/${loc._id}`);
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
        name: selected.name, Street: selected.Street, city: selected.city,
        state: selected.state, country_code: selected.country_code,
        zip: selected.zip, latitude: selected.latitude, longitude: selected.longitude, rate,
      });
      setLocations((prev) => prev.map((l) => l._id === selected._id ? { ...l, rate } : l));
      setSelected((s) => s ? { ...s, rate } : null);
      setEditing(false);
    } catch (e) { console.error(e); }
    finally { setSavingRate(false); }
  }

  const countryName = (code: string) =>
    COUNTRIES.find((c) => c.code === code)?.name ?? code;

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
              <div key={loc._id} onClick={() => openDetail(loc)}
                className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow ${loc.isBlocked ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{loc.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{loc.city}, {countryName(loc.country_code)}</p>
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
                <div><span className="text-gray-500">Country</span><p className="font-medium mt-0.5">{countryName(selected.country_code)} ({selected.country_code})</p></div>
                <div><span className="text-gray-500">ZIP</span><p className="font-medium mt-0.5">{selected.zip}</p></div>
                <div><span className="text-gray-500">Total Bookings</span><p className="font-medium mt-0.5">{selected.booking?.length || 0}</p></div>
                <div><span className="text-gray-500">Latitude</span><p className="font-medium mt-0.5">{selected.latitude}</p></div>
                <div><span className="text-gray-500">Longitude</span><p className="font-medium mt-0.5">{selected.longitude}</p></div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-emerald-800">Location Rate (R / min)</p>
                  {!editing && (
                    <button type="button" onClick={() => setEditing(true)}
                      className="text-xs text-indigo-600 hover:underline font-medium">Edit</button>
                  )}
                </div>
                {editing ? (
                  <div className="flex gap-2">
                    <input type="number" min="0" step="0.01" value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="e.g. 1.00" />
                    <button type="button" onClick={saveRate} disabled={savingRate}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                      {savingRate ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={() => { setEditing(false); setEditRate(String(selected.rate ?? "")); }}
                      className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-emerald-700">
                    {selected.rate && selected.rate > 0 ? `R ${selected.rate}/min` : "Not set"}
                  </p>
                )}
              </div>

              <div className="pt-1 flex gap-3">
                <button type="button" onClick={() => openEditLocation(selected)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors">
                  Edit Location
                </button>
                <button type="button" onClick={() => toggleBlock(selected)} disabled={actioning}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${selected.isBlocked ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}>
                  {selected.isBlocked ? "Unblock" : "Block"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Location Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Add New Location</h3>
              <button type="button" onClick={() => { setCreateOpen(false); setCreateForm(emptyForm); }}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <LocationForm
              form={createForm}
              onChange={setCreateForm}
              onSubmit={createLocation}
              onCancel={() => { setCreateOpen(false); setCreateForm(emptyForm); }}
              submitting={creating}
              submitLabel="Create Location"
            />
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {editPod && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Edit Location</h3>
              <button type="button" onClick={() => setEditPod(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <LocationForm
              form={editForm}
              onChange={setEditForm}
              onSubmit={saveLocation}
              onCancel={() => setEditPod(null)}
              submitting={saving}
              submitLabel="Save Changes"
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
