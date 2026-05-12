"use client";
import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import { api } from "@/lib/api";
import { downloadCSV } from "@/lib/exportCsv";

interface Location { _id: string; name: string; city: string }

interface Transaction {
  _id: string; amount: number; currency: string;
  merchantId: string; checkoutId: string;
  paymentFacilitator: string; status: string; createdAt: string;
}

interface Booking {
  _id: string; podTitle: string; status: string;
  bookingDate: string; startTime: string; endTime: string;
  bookingPurpose: string; shortDescription?: string;
  qrCodeData?: string; Userid?: string; serial?: string;
  password?: string; createdAt: string;
  user?: { _id: string; firstname: string; lastname: string; email: string; phoneNumber: string };
  podId?: { _id: string; title: string; deviceId?: string; serial?: string; UserId?: string; location?: { name: string; city: string } };
  feedback?: { rating: number; message: string };
  transaction?: Transaction | null;
}

interface Rating {
  _id: string; star: number; comment: string; createdAt: string;
  postedby?: { firstname: string; lastname: string };
}

interface DetailBooking extends Booking {
  podId?: Booking["podId"] & { ratings?: Rating[] };
}

interface DetailData { booking: DetailBooking; transaction: Transaction | null }

interface PaginatedResponse {
  data: Booking[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

const STATUSES = ["all", "Pending", "Confirmed", "Processing", "Completed", "Cancelled", "Rated"];

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTime = (d?: string) =>
  d ? new Date(d).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtFull = (d?: string) =>
  d ? new Date(d).toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }
  return (
    <button type="button" onClick={copy} title="Copy to clipboard"
      className="ml-1 text-xs text-gray-400 hover:text-indigo-600 shrink-0 transition-colors">
      {copied ? "✓" : label || "⎘"}
    </button>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [locations, setLocations] = useState<Location[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [locationId, setLocationId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "transaction" | "ratings">("details");
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get<Location[]>("/admin/locations").then(setLocations).catch(console.error);
  }, []);

  const fetchBookings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: "20",
        ...(status !== "all" && { status }),
        ...(appliedSearch && { search: appliedSearch }),
        ...(locationId !== "all" && { locationId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      const res = await api.get<PaginatedResponse>(`/admin/bookings?${params}`);
      setBookings(res.data);
      setPagination(res.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [status, appliedSearch, locationId, startDate, endDate]);

  useEffect(() => { fetchBookings(1); }, [fetchBookings]);

  async function openDetail(bookingId: string) {
    setDetailLoading(true);
    setSelected(null);
    setActiveTab("details");
    try {
      const data = await api.get<DetailData>(`/admin/booking/${bookingId}`);
      setSelected(data);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  }

  async function updateStatus(bookingId: string, newStatus: string) {
    setUpdating(true);
    try {
      await api.put(`/user/update-booking-status/${bookingId}`, { status: newStatus });
      fetchBookings(pagination.page);
      if (selected) setSelected((s) => s ? { ...s, booking: { ...s.booking, status: newStatus } } : null);
    } catch (e) { console.error(e); }
    finally { setUpdating(false); }
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api.put(`/user/cancel-booking/${id}`);
      fetchBookings(pagination.page);
      setSelected(null);
    } catch (e) { console.error(e); }
  }

  async function exportCSV() {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        page: "1", limit: "10000",
        ...(status !== "all" && { status }),
        ...(appliedSearch && { search: appliedSearch }),
        ...(locationId !== "all" && { locationId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      const res = await api.get<PaginatedResponse>(`/admin/bookings?${params}`);
      const rows = res.data.map((bk) => ({
        "Booking ID": bk._id,
        "Pod": bk.podTitle,
        "User Name": bk.user ? `${bk.user.firstname} ${bk.user.lastname}` : "—",
        "User Email": bk.user?.email || "—",
        "User Phone": bk.user?.phoneNumber || "—",
        "Status": bk.status,
        "Booking Date": fmt(bk.bookingDate),
        "Start Time": fmtTime(bk.startTime),
        "End Time": fmtTime(bk.endTime),
        "Purpose": bk.bookingPurpose || "—",
        "Created At": fmt(bk.createdAt),
        "Transaction Amount": bk.transaction ? `${bk.transaction.currency} ${(bk.transaction.amount / 100).toFixed(2)}` : "—",
        "Transaction Status": bk.transaction?.status || "—",
      }));
      downloadCSV(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  }

  const b = selected?.booking;
  const txn = selected?.transaction;
  const ratings = b?.podId?.ratings || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
            <p className="text-gray-500 text-sm mt-1">{pagination.total} total bookings</p>
          </div>
          <button
            type="button"
            onClick={exportCSV}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {exporting ? "Exporting…" : "⬇ Export CSV"}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex">
              <input
                type="text"
                aria-label="Search bookings"
                placeholder="Search ID, name, pod, location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setAppliedSearch(search)}
                className="px-3 py-2 border border-gray-200 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
              <button type="button" onClick={() => setAppliedSearch(search)}
                className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-r-lg hover:bg-indigo-700">
                Search
              </button>
            </div>

            <select
              title="Filter by location"
              aria-label="Filter by location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Locations</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>{l.name} — {l.city}</option>
              ))}
            </select>

            <select
              title="Filter by status"
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All Statuses" : s}</option>)}
            </select>

            <div className="flex items-center gap-1">
              <input type="date" aria-label="Start date" title="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <span className="text-gray-400 text-xs">to</span>
              <input type="date" aria-label="End date" title="End date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <button type="button"
              onClick={() => { setSearch(""); setAppliedSearch(""); setStatus("all"); setLocationId("all"); setStartDate(""); setEndDate(""); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ref ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pod</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date &amp; Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transaction</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">Loading bookings…</td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">No bookings found</td></tr>
                ) : bookings.map((bk) => (
                  <tr key={bk._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-400">#{bk._id.slice(-8)}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[130px] truncate">{bk.podTitle}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 text-sm">{bk.user ? `${bk.user.firstname} ${bk.user.lastname}` : "—"}</div>
                      <div className="text-gray-400 text-xs">{bk.user?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{bk.podId?.location?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 text-sm">{fmt(bk.bookingDate)}</div>
                      <div className="text-gray-400 text-xs">{fmtTime(bk.startTime)} – {fmtTime(bk.endTime)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {bk.transaction ? (
                        <div>
                          <StatusBadge status={bk.transaction.status} />
                          <div className="text-xs text-gray-500 mt-0.5">{bk.transaction.currency} {(bk.transaction.amount / 100).toFixed(2)}</div>
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={bk.status} /></td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openDetail(bk._id)} title="View"
                        className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} onPage={fetchBookings} />
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {(detailLoading || selected) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            {detailLoading ? (
              <div className="flex items-center justify-center h-64 text-gray-400">Loading details…</div>
            ) : selected && (
              <>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="font-bold text-gray-900">{b?.podTitle}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs text-gray-400">Booking #{b?._id.slice(-10)}</span>
                      {b && <CopyBtn value={b._id} label="Copy ID" />}
                      <span className="text-gray-300">·</span>
                      {b && <StatusBadge status={b.status} />}
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
                </div>

                {/* Tabs */}
                <div className="px-6 flex gap-1 border-b border-gray-100 shrink-0">
                  {(["details", "transaction", "ratings"] as const).map((tab) => (
                    <button type="button" key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      {tab}
                      {tab === "transaction" && txn && (
                        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${txn.status === "successful" || txn.status === "success" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {txn.currency} {(txn.amount / 100).toFixed(2)}
                        </span>
                      )}
                      {tab === "ratings" && ratings.length > 0 && (
                        <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{ratings.length}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                  {/* DETAILS */}
                  {activeTab === "details" && b && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-medium">Reference ID</p>
                          <div className="flex items-center mt-0.5">
                            <span className="font-mono text-xs text-gray-800 break-all">{b._id}</span>
                            <CopyBtn value={b._id} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-medium">Booked On</p>
                          <p className="font-medium mt-0.5">{fmtFull(b.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-medium">Booking Date</p>
                          <p className="font-medium mt-0.5">{fmt(b.bookingDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-medium">Time Slot</p>
                          <p className="font-medium mt-0.5">{fmtTime(b.startTime)} – {fmtTime(b.endTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-medium">Location</p>
                          <p className="font-medium mt-0.5">{b.podId?.location?.name || "—"}{b.podId?.location?.city ? `, ${b.podId.location.city}` : ""}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-medium">Purpose</p>
                          <p className="font-medium mt-0.5">{b.bookingPurpose}</p>
                        </div>
                      </div>

                      {/* User */}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-400 uppercase font-medium mb-2">User</p>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                            {b.user?.firstname?.[0] || "?"}
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">{b.user ? `${b.user.firstname} ${b.user.lastname}` : "Unknown"}</p>
                            <p className="text-gray-500 text-xs">{b.user?.email} · {b.user?.phoneNumber}</p>
                          </div>
                        </div>
                      </div>

                      {/* Device */}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-400 uppercase font-medium mb-2">Pod / Device Info</p>
                        <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-3">
                          <div>
                            <p className="text-xs text-gray-400">Pod Title</p>
                            <p className="font-medium mt-0.5">{b.podTitle}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Device S/N</p>
                            <div className="flex items-center mt-0.5">
                              <span className="font-mono font-medium text-gray-800">{b.serial || b.podId?.serial || "—"}</span>
                              {(b.serial || b.podId?.serial) && <CopyBtn value={b.serial || b.podId?.serial || ""} />}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Device User ID</p>
                            <div className="flex items-center mt-0.5">
                              <span className="font-mono font-medium text-gray-800">{b.Userid || b.podId?.UserId || "—"}</span>
                              {(b.Userid || b.podId?.UserId) && <CopyBtn value={b.Userid || b.podId?.UserId || ""} />}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Device ID</p>
                            <div className="flex items-center mt-0.5">
                              <span className="font-mono font-medium text-gray-800">{b.podId?.deviceId || "—"}</span>
                              {b.podId?.deviceId && <CopyBtn value={b.podId.deviceId} />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Feedback */}
                      {b.feedback?.rating ? (
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-400 uppercase font-medium mb-2">User Feedback</p>
                          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                            <span className="text-yellow-500 text-lg leading-none">{"★".repeat(b.feedback.rating)}{"☆".repeat(5 - b.feedback.rating)}</span>
                            {b.feedback.message && <p className="text-sm text-gray-700">{b.feedback.message}</p>}
                          </div>
                        </div>
                      ) : null}

                      {/* Status actions */}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-400 uppercase font-medium mb-2">Update Status</p>
                        <div className="flex flex-wrap gap-2">
                          {["Confirmed", "Processing", "Completed"].map((s) => (
                            <button type="button" key={s} onClick={() => updateStatus(b._id, s)}
                              disabled={updating || b.status === s}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40">
                              Mark {s}
                            </button>
                          ))}
                          <button type="button" onClick={() => cancelBooking(b._id)}
                            disabled={updating || b.status === "Cancelled"}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40">
                            Cancel Booking
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TRANSACTION */}
                  {activeTab === "transaction" && (
                    <div>
                      {!txn ? (
                        <div className="py-12 text-center">
                          <p className="text-4xl mb-3">💳</p>
                          <p className="text-gray-500 font-medium">No transaction linked to this booking</p>
                          <p className="text-gray-400 text-sm mt-1">Payment may not have been completed or was not recorded</p>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className={`p-4 rounded-xl flex items-center justify-between ${txn.status === "successful" || txn.status === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Amount Paid</p>
                              <p className="text-2xl font-bold text-gray-900 mt-0.5">{txn.currency} {(txn.amount / 100).toFixed(2)}</p>
                            </div>
                            <StatusBadge status={txn.status} />
                          </div>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-medium">Transaction ID</p>
                              <div className="flex items-center mt-0.5">
                                <span className="font-mono text-xs text-gray-700 break-all">{txn._id}</span>
                                <CopyBtn value={txn._id} />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-medium">Date &amp; Time</p>
                              <p className="font-medium mt-0.5">{fmtFull(txn.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-medium">Checkout ID</p>
                              <div className="flex items-center mt-0.5">
                                <span className="font-mono text-xs text-gray-700 break-all">{txn.checkoutId}</span>
                                <CopyBtn value={txn.checkoutId} />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-medium">Merchant ID</p>
                              <div className="flex items-center mt-0.5">
                                <span className="font-mono text-xs text-gray-700">{txn.merchantId}</span>
                                <CopyBtn value={txn.merchantId} />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-medium">Facilitator</p>
                              <p className="font-medium mt-0.5">{txn.paymentFacilitator}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-medium">Currency</p>
                              <p className="font-medium mt-0.5">{txn.currency}</p>
                            </div>
                          </div>

                          <div className="border border-orange-200 bg-orange-50 rounded-xl p-4">
                            <p className="text-sm font-semibold text-orange-800 mb-1">🔄 Refund / Dispute</p>
                            <p className="text-xs text-orange-700 leading-relaxed">
                              To process a refund, use the <strong>Checkout ID</strong> in your Yoco merchant dashboard or contact
                              Yoco support at <strong>support@yoco.com</strong> with both IDs below.
                            </p>
                            <div className="mt-3 flex gap-2">
                              <button type="button" onClick={() => navigator.clipboard.writeText(txn.checkoutId).catch(() => {})}
                                className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                                Copy Checkout ID
                              </button>
                              <button type="button" onClick={() => navigator.clipboard.writeText(txn.merchantId).catch(() => {})}
                                className="text-xs px-3 py-1.5 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100">
                                Copy Merchant ID
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RATINGS */}
                  {activeTab === "ratings" && (
                    <div>
                      {ratings.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-4xl mb-3">⭐</p>
                          <p className="text-gray-500 font-medium">No ratings yet for this pod</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl">
                            <span className="text-3xl font-bold text-yellow-600">
                              {(ratings.reduce((s, r) => s + r.star, 0) / ratings.length).toFixed(1)}
                            </span>
                            <div>
                              <div className="text-yellow-500">{"★".repeat(Math.round(ratings.reduce((s, r) => s + r.star, 0) / ratings.length))}{"☆".repeat(5 - Math.round(ratings.reduce((s, r) => s + r.star, 0) / ratings.length))}</div>
                              <p className="text-xs text-gray-500 mt-0.5">{ratings.length} review{ratings.length !== 1 ? "s" : ""} for <strong>{b?.podTitle}</strong></p>
                            </div>
                          </div>
                          {ratings.map((r) => (
                            <div key={r._id} className="border border-gray-100 rounded-xl p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                                    {r.postedby ? r.postedby.firstname[0] : "U"}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {r.postedby ? `${r.postedby.firstname} ${r.postedby.lastname}` : "User"}
                                    </p>
                                    <p className="text-xs text-gray-400">{fmtFull(r.createdAt)}</p>
                                  </div>
                                </div>
                                <span className="text-yellow-500">{"★".repeat(r.star)}{"☆".repeat(5 - r.star)}</span>
                              </div>
                              {r.comment && <p className="mt-2 text-sm text-gray-700 leading-relaxed pl-10">{r.comment}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
