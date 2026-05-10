"use client";
import { useEffect, useState, FormEvent } from "react";
import AdminLayout from "@/components/AdminLayout";
import { api } from "@/lib/api";

interface Rate { _id: string; rate: number }
interface Discount { _id: string; discount: number }

export default function PricingPage() {
  const [rate, setRate] = useState<Rate | null>(null);
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [newRate, setNewRate] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [rateMsg, setRateMsg] = useState("");
  const [discountMsg, setDiscountMsg] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Rate>("/transactions/getrate").catch(() => null),
      api.get<Discount>("/transactions/getdiscount").catch(() => null),
    ]).then(([r, d]) => {
      if (r) { setRate(r); setNewRate(String(r.rate)); }
      if (d) { setDiscount(d); setNewDiscount(String(d.discount)); }
    }).finally(() => setLoading(false));
  }, []);

  async function handleSaveRate(e: FormEvent) {
    e.preventDefault();
    setSavingRate(true);
    setRateMsg("");
    try {
      const updated = await api.post<Rate>("/transactions/ManageRates", { rate: Number(newRate) });
      setRate(updated);
      setRateMsg("Rate updated successfully!");
    } catch (e: unknown) {
      setRateMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingRate(false);
      setTimeout(() => setRateMsg(""), 3000);
    }
  }

  async function handleSaveDiscount(e: FormEvent) {
    e.preventDefault();
    setSavingDiscount(true);
    setDiscountMsg("");
    try {
      const updated = await api.post<Discount>("/transactions/ManageDiscount", { discount: Number(newDiscount) });
      setDiscount(updated);
      setDiscountMsg("Discount updated successfully!");
    } catch (e: unknown) {
      setDiscountMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingDiscount(false);
      setTimeout(() => setDiscountMsg(""), 3000);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-xl">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pricing & Discounts</h2>
          <p className="text-gray-500 text-sm mt-1">Manage global hourly rate and discount percentage</p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Rate Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl">💰</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Hourly Rate</h3>
                  <p className="text-sm text-gray-500">Current: <span className="font-medium text-gray-900">R {rate?.rate ?? "—"}</span> per hour</p>
                </div>
              </div>
              <form onSubmit={handleSaveRate} className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingRate}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
                >
                  {savingRate ? "Saving..." : "Update Rate"}
                </button>
              </form>
              {rateMsg && (
                <p className={`mt-2 text-sm ${rateMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>{rateMsg}</p>
              )}
            </div>

            {/* Discount Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-xl">🏷️</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Global Discount</h3>
                  <p className="text-sm text-gray-500">Current: <span className="font-medium text-gray-900">{discount?.discount ?? "—"}%</span> off</p>
                </div>
              </div>
              <form onSubmit={handleSaveDiscount} className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    placeholder="0"
                    className="w-full pr-8 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                <button
                  type="submit"
                  disabled={savingDiscount}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
                >
                  {savingDiscount ? "Saving..." : "Update Discount"}
                </button>
              </form>
              {discountMsg && (
                <p className={`mt-2 text-sm ${discountMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>{discountMsg}</p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2">Pricing Summary</h4>
              <div className="space-y-1 text-sm text-indigo-800">
                <p>Base Rate: <strong>R {rate?.rate ?? 0}/hr</strong></p>
                <p>Discount: <strong>{discount?.discount ?? 0}%</strong></p>
                <p>Effective Rate: <strong>R {rate && discount ? ((rate.rate * (100 - discount.discount)) / 100).toFixed(2) : rate?.rate ?? 0}/hr</strong></p>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
