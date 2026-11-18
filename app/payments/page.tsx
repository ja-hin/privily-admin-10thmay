"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { api } from "@/lib/api";

type Gateway = "yoco" | "paystack";
const ALL: Gateway[] = ["yoco", "paystack"];
const META: Record<Gateway, { title: string; blurb: string; dashboard: string }> = {
  yoco:     { title: "Yoco",     blurb: "Card payments via Yoco hosted checkout.",                 dashboard: "https://portal.yoco.com" },
  paystack: { title: "Paystack", blurb: "Card, EFT and instant payments via Paystack hosted checkout.", dashboard: "https://dashboard.paystack.com" },
};

interface SettingsResponse {
  settings: { enabledGateways: Gateway[]; defaultGateway: Gateway; updatedAt?: string; updatedBy?: string | null };
  configured: Record<Gateway, boolean>;
  effective: { enabledGateways: Gateway[]; defaultGateway: Gateway | null };
}

export default function PaymentsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [enabled, setEnabled] = useState<Gateway[]>([]);
  const [def, setDef] = useState<Gateway>("yoco");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const d = await api.get<SettingsResponse>("/admin/payment-settings");
      setData(d);
      setEnabled(d.settings.enabledGateways);
      setDef(d.settings.defaultGateway);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function toggle(g: Gateway) {
    setEnabled((cur) => {
      const next = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g];
      if (!next.includes(def) && next.length) setDef(next[0]);
      return next;
    });
  }

  async function save() {
    if (enabled.length === 0) { setMsg({ ok: false, text: "At least one gateway must stay enabled." }); return; }
    setSaving(true); setMsg(null);
    try {
      const d = await api.put<{ message: string; effective: SettingsResponse["effective"] }>("/admin/payment-settings", {
        enabledGateways: enabled, defaultGateway: def,
      });
      setMsg({ ok: true, text: d.message });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  const dirty = data && (
    JSON.stringify([...enabled].sort()) !== JSON.stringify([...data.settings.enabledGateways].sort()) ||
    def !== data.settings.defaultGateway
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Gateways</h2>
          <p className="text-gray-500 text-sm mt-1">
            Choose which gateways customers can pay with in the app and on the website, and which one is offered first.
            Changes apply immediately to new checkouts. No app update is needed.
          </p>
        </div>

        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg.text}
          </div>
        )}

        {loading || !data ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {ALL.map((g) => {
                const configured = data.configured[g];
                const on = enabled.includes(g);
                const live = data.effective.enabledGateways.includes(g);
                return (
                  <div key={g} className="p-5 flex items-start gap-4">
                    <label className="relative inline-flex items-center cursor-pointer mt-1">
                      <input type="checkbox" className="sr-only peer" checked={on} disabled={!configured} onChange={() => toggle(g)} aria-label={`Enable ${META[g].title}`} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:bg-indigo-600 peer-disabled:opacity-40 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{META[g].title}</p>
                        {!configured && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">keys not set on server</span>}
                        {configured && live && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">live for customers</span>}
                        {configured && !live && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">hidden from customers</span>}
                        {data.effective.defaultGateway === g && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">default</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{META[g].blurb}</p>
                      <div className="mt-3 flex items-center gap-4">
                        <label className={`inline-flex items-center gap-2 text-sm ${on ? "text-gray-700" : "text-gray-400"}`}>
                          <input type="radio" name="defaultGateway" value={g} checked={def === g} disabled={!on} onChange={() => setDef(g)} />
                          Offer first
                        </label>
                        <a href={META[g].dashboard} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">
                          Open {META[g].title} dashboard ↗
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {data.settings.updatedAt ? `Last changed ${new Date(data.settings.updatedAt).toLocaleString("en-ZA")}${data.settings.updatedBy ? ` by ${data.settings.updatedBy}` : ""}` : "Never changed"}
              </p>
              <button type="button" onClick={save} disabled={!dirty || saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40">
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">When Yoco is having problems</p>
              <p>Switch &ldquo;Offer first&rdquo; to Paystack, or turn Yoco off entirely. Customers on the next checkout will be sent to Paystack. Bookings and refunds already made through Yoco are unaffected.</p>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
