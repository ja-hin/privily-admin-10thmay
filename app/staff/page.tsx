"use client";
import { useEffect, useState, FormEvent } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";

interface Staff {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  phoneNumber: string;
  role: string;
  isBlocked: boolean;
  auth_page: number[];
  createdAt: string;
}

const PAGE_LABELS: Record<number, string> = {
  2: "Features",
  3: "Pods",
  4: "VIP Pods",
  5: "User Details",
  6: "Bookings",
  7: "Locations",
  8: "Transactions",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstname: "", lastname: "", email: "", phoneNumber: "",
    password: "", role: "staff", auth_page: [] as number[],
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    api.get<Staff[]>("/user/all-staff")
      .then(setStaff)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function togglePage(page: number) {
    setForm((f) => ({
      ...f,
      auth_page: f.auth_page.includes(page)
        ? f.auth_page.filter((p) => p !== page)
        : [...f.auth_page, page],
    }));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (form.auth_page.length === 0) { setFormError("Select at least one page permission"); return; }
    setActioning(true);
    try {
      await api.post("/user/register-staff", form);
      const updated = await api.get<Staff[]>("/user/all-staff");
      setStaff(updated);
      setShowForm(false);
      setForm({ firstname: "", lastname: "", email: "", phoneNumber: "", password: "", role: "staff", auth_page: [] });
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to create staff");
    } finally {
      setActioning(false);
    }
  }

  async function toggleBlock(s: Staff) {
    if (!confirm(`${s.isBlocked ? "Unblock" : "Block"} ${s.firstname}?`)) return;
    setActioning(true);
    try {
      const endpoint = s.isBlocked ? `/user/unblock-staff/${s._id}` : `/user/block-staff/${s._id}`;
      await api.put(endpoint);
      setStaff((prev) => prev.map((m) => m._id === s._id ? { ...m, isBlocked: !m.isBlocked } : m));
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  }

  async function deleteStaff(id: string) {
    if (!confirm("Delete this staff member?")) return;
    setActioning(true);
    try {
      await api.delete(`/user/delete-staff/${id}`);
      setStaff((prev) => prev.filter((s) => s._id !== id));
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Staff</h2>
            <p className="text-gray-500 text-sm mt-1">{staff.length} staff members</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
          >
            + Add Staff
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Permissions</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : staff.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No staff members yet</td></tr>
                ) : staff.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{s.firstname} {s.lastname}</td>
                    <td className="px-6 py-3 text-gray-600">{s.email}</td>
                    <td className="px-6 py-3 capitalize text-gray-600">{s.role}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.auth_page?.map((p) => (
                          <span key={p} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                            {PAGE_LABELS[p] || `Page ${p}`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3"><StatusBadge status={s.isBlocked ? "blocked" : "active"} /></td>
                    <td className="px-6 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => toggleBlock(s)}
                          disabled={actioning}
                          className={`text-xs font-medium hover:underline ${s.isBlocked ? "text-green-600" : "text-orange-500"}`}
                        >
                          {s.isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() => deleteStaff(s._id)}
                          disabled={actioning}
                          className="text-xs font-medium text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Add Staff Member</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{formError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">First Name</label>
                  <input required value={form.firstname} onChange={(e) => setForm({ ...form, firstname: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Last Name</label>
                  <input required value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Phone Number</label>
                <input required value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Password</label>
                <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">Page Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PAGE_LABELS).map(([page, label]) => (
                    <label key={page} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.auth_page.includes(Number(page))}
                        onChange={() => togglePage(Number(page))}
                        className="rounded text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={actioning}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
              >
                {actioning ? "Creating..." : "Create Staff Member"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
