"use client";
import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import { api } from "@/lib/api";

interface User {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  phoneNumber: string;
  isBlocked: boolean;
  role: string;
  createdAt: string;
  booking?: { _id: string; status: string; podTitle: string }[];
}

interface PaginatedResponse {
  data: User[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [search, setSearch] = useState("");
  const [filterBlocked, setFilterBlocked] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);
  const [actioning, setActioning] = useState(false);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
        ...(filterBlocked !== "all" && { isBlocked: filterBlocked }),
      });
      const res = await api.get<PaginatedResponse>(`/admin/users?${params}`);
      setUsers(res.data);
      setPagination(res.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filterBlocked]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  async function toggleBlock(user: User) {
    if (!confirm(`${user.isBlocked ? "Unblock" : "Block"} ${user.firstname} ${user.lastname}?`)) return;
    setActioning(true);
    try {
      const endpoint = user.isBlocked ? `/user/unblock-user/${user._id}` : `/user/block-user/${user._id}`;
      await api.put(endpoint);
      fetchUsers(pagination.page);
      setSelected(null);
    } catch (e) {
      console.error(e);
    } finally {
      setActioning(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="text-gray-500 text-sm mt-1">{pagination.total} registered users</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
          <select
            value={filterBlocked}
            onChange={(e) => setFilterBlocked(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Users</option>
            <option value="false">Active</option>
            <option value="true">Blocked</option>
          </select>
          <button
            onClick={() => { setSearch(""); setFilterBlocked("all"); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
          >
            Clear
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Bookings</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No users found</td></tr>
                ) : users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{u.firstname} {u.lastname}</td>
                    <td className="px-6 py-3 text-gray-600">{u.email}</td>
                    <td className="px-6 py-3 text-gray-600">{u.phoneNumber}</td>
                    <td className="px-6 py-3 text-gray-600">{u.booking?.length || 0}</td>
                    <td className="px-6 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={u.isBlocked ? "blocked" : "active"} />
                    </td>
                    <td className="px-6 py-3 flex gap-3">
                      <button
                        onClick={() => setSelected(u)}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => toggleBlock(u)}
                        disabled={actioning}
                        className={`text-xs font-medium hover:underline ${u.isBlocked ? "text-green-600" : "text-red-500"}`}
                      >
                        {u.isBlocked ? "Unblock" : "Block"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} onPage={fetchUsers} />
        </div>
      </div>

      {/* User Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">User Details</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                  {selected.firstname[0]}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">{selected.firstname} {selected.lastname}</h4>
                  <p className="text-gray-500 text-sm">{selected.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Phone</span><p className="font-medium mt-0.5">{selected.phoneNumber}</p></div>
                <div><span className="text-gray-500">Role</span><p className="font-medium mt-0.5 capitalize">{selected.role}</p></div>
                <div><span className="text-gray-500">Status</span><div className="mt-0.5"><StatusBadge status={selected.isBlocked ? "blocked" : "active"} /></div></div>
                <div><span className="text-gray-500">Joined</span><p className="font-medium mt-0.5">{new Date(selected.createdAt).toLocaleDateString()}</p></div>
                <div><span className="text-gray-500">Total Bookings</span><p className="font-medium mt-0.5">{selected.booking?.length || 0}</p></div>
              </div>

              {selected.booking && selected.booking.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Recent Bookings</p>
                  <div className="space-y-2">
                    {selected.booking.slice(0, 5).map((b) => (
                      <div key={b._id} className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-700">{b.podTitle || b._id.slice(-8)}</span>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => toggleBlock(selected)}
                  disabled={actioning}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected.isBlocked
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {selected.isBlocked ? "Unblock User" : "Block User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
