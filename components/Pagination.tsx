interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}

export default function Pagination({ page, pages, total, limit, onPage }: PaginationProps) {
  if (pages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{from}</span>–<span className="font-medium">{to}</span> of{" "}
        <span className="font-medium">{total}</span>
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
        >
          ←
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                p === page
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
        >
          →
        </button>
      </div>
    </div>
  );
}
