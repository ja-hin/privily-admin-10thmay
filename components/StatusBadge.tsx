const styles: Record<string, { bg: string; color: string; dot: string }> = {
  Pending:     { bg: "#fffbeb", color: "#92400e", dot: "#f59e0b" },
  Confirmed:   { bg: "#eff6ff", color: "#1e40af", dot: "#3b82f6" },
  Processing:  { bg: "#f5f3ff", color: "#5b21b6", dot: "#8b5cf6" },
  Completed:   { bg: "#f0fdf4", color: "#14532d", dot: "#22c55e" },
  Cancelled:   { bg: "#fef2f2", color: "#7f1d1d", dot: "#ef4444" },
  Rated:       { bg: "#fdf4ff", color: "#701a75", dot: "#d946ef" },
  successful:  { bg: "#f0fdf4", color: "#14532d", dot: "#22c55e" },
  success:     { bg: "#f0fdf4", color: "#14532d", dot: "#22c55e" },
  SUCCESSFUL:  { bg: "#f0fdf4", color: "#14532d", dot: "#22c55e" },
  failed:      { bg: "#fef2f2", color: "#7f1d1d", dot: "#ef4444" },
  active:      { bg: "#f0fdf4", color: "#14532d", dot: "#22c55e" },
  blocked:     { bg: "#fef2f2", color: "#7f1d1d", dot: "#ef4444" },
  pending:     { bg: "#fffbeb", color: "#92400e", dot: "#f59e0b" },
};

const defaultStyle = { bg: "#f8fafc", color: "#475569", dot: "#94a3b8" };

export default function StatusBadge({ status }: { status: string }) {
  const s = styles[status] || defaultStyle;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {status}
    </span>
  );
}
