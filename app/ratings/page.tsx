"use client";
import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import Pagination from "@/components/Pagination";
import { api } from "@/lib/api";

interface Location { _id: string; name: string; city: string }

interface Rating {
  _id: string;
  productId: string;
  productTitle: string;
  location?: { _id: string; name: string; city: string };
  star: number;
  comment: string;
  createdAt: string;
  user: { _id: string; name: string; email: string } | null;
}

interface PaginatedResponse {
  data: Rating[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

const fmtFull = (d?: string) =>
  d ? new Date(d).toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-yellow-500 text-sm tracking-tight">
      {"★".repeat(Math.min(5, Math.max(0, n)))}
      {"☆".repeat(Math.max(0, 5 - n))}
    </span>
  );
}

export default function RatingsPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("all");
  const [starFilter, setStarFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Location[]>("/admin/locations").then(setLocations).catch(console.error);
  }, []);

  const fetchRatings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: "20",
        ...(locationId !== "all" && { locationId }),
      });
      const res = await api.get<PaginatedResponse>(`/admin/ratings?${params}`);
      const data = starFilter !== "all"
        ? { ...res, data: res.data.filter((r) => r.star === Number(starFilter)) }
        : res;
      setRatings(data.data);
      setPagination(res.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [locationId, starFilter]);

  useEffect(() => { fetchRatings(1); }, [fetchRatings]);

  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + r.star, 0) / ratings.length).toFixed(1)
    : "—";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ratings &amp; Reviews</h2>
            <p className="text-gray-500 text-sm mt-1">{pagination.total} total ratings · avg {avg} ⭐</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
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
            title="Filter by star rating"
            aria-label="Filter by star rating"
            value={starFilter}
            onChange={(e) => setStarFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Stars</option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={s}>{"★".repeat(s)} {s} star{s !== 1 ? "s" : ""}</option>
            ))}
          </select>

          <button type="button" onClick={() => { setLocationId("all"); setStarFilter("all"); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
            Clear
          </button>
        </div>

        {/* Star distribution */}
        {!loading && ratings.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Star Distribution</p>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratings.filter((r) => r.star === star).length;
                const pct = ratings.length ? Math.round((count / ratings.length) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="text-yellow-500 w-16">{"★".repeat(star)}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-gray-500 w-10 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Pod</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Review</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Loading ratings…</td></tr>
                ) : ratings.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No ratings found</td></tr>
                ) : ratings.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      {r.user ? (
                        <div>
                          <div className="font-medium text-gray-900">{r.user.name}</div>
                          <div className="text-xs text-gray-400">{r.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Deleted user</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{r.productTitle}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {r.location ? `${r.location.name}, ${r.location.city}` : "—"}
                    </td>
                    <td className="px-5 py-3"><Stars n={r.star} /></td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs">
                      {r.comment ? (
                        <p className="truncate" title={r.comment}>{r.comment}</p>
                      ) : (
                        <span className="text-gray-300 italic text-xs">No comment</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{fmtFull(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} onPage={fetchRatings} />
        </div>
      </div>
    </AdminLayout>
  );
}
