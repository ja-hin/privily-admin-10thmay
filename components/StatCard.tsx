interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  gradient: string;
  sub?: string;
  trend?: number;
}

export default function StatCard({ title, value, icon, gradient, sub, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1 w-full" style={{ background: gradient }} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: gradient.replace("linear-gradient", "linear-gradient").replace(")", ", 0.12)").replace("(", "(") + "", opacity: 1 }}
          >
            {icon}
          </div>
          {trend !== undefined && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500 mt-0.5">{title}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
