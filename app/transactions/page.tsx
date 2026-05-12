"use client";
import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import { api } from "@/lib/api";
import { downloadCSV } from "@/lib/exportCsv";

interface Transaction {
  _id: string;
  amount: number;
  currency: string;
  merchantId: string;
  checkoutId: string;
  paymentFacilitator: string;
  status: string;
  createdAt: string;
}

interface PaginatedResponse {
  data: Transaction[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [exporting, setExporting] = useState(false);

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await api.get<PaginatedResponse>(`/admin/transactions?${params}`);
      setTransactions(res.data);
      setPagination(res.pagination);
      if (page === 1) {
        const total = res.data
          .filter((t) => ["successful", "success", "SUCCESSFUL"].includes(t.status))
          .reduce((sum, t) => sum + t.amount, 0);
        setTotalRevenue(total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchTransactions(1); }, [fetchTransactions]);

  async function exportCSV() {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        page: "1", limit: "10000",
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await api.get<PaginatedResponse>(`/admin/transactions?${params}`);
      const rows = res.data.map((t) => ({
        "Transaction ID": t._id,
        "Amount": `${t.currency} ${(t.amount / 100).toFixed(2)}`,
        "Facilitator": t.paymentFacilitator,
        "Merchant ID": t.merchantId,
        "Checkout ID": t.checkoutId,
        "Status": t.status,
        "Date": new Date(t.createdAt).toLocaleDateString("en-ZA"),
      }));
      downloadCSV(`transactions-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
            <p className="text-gray-500 text-sm mt-1">{pagination.total} total transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3">
              <p className="text-xs text-green-600 font-medium">Revenue (current page)</p>
              <p className="text-xl font-bold text-green-700">R {(totalRevenue / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
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
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-3">
          <select
            title="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Facilitator</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Merchant ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Checkout ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No transactions found</td></tr>
                ) : transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{t._id.slice(-10)}</td>
                    <td className="px-6 py-3 font-semibold text-gray-900">
                      {t.currency} {(t.amount / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{t.paymentFacilitator}</td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{t.merchantId?.slice(-10) || "—"}</td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{t.checkoutId?.slice(-10) || "—"}</td>
                    <td className="px-6 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-6 py-3 text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} onPage={fetchTransactions} />
        </div>
      </div>
    </AdminLayout>
  );
}
