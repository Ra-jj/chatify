// Mirrors Sidebar: title row, segmented control, toggle row, then 44px-avatar rows
const SidebarSkeleton = ({ className = "flex h-full w-full flex-col border-r border-base-content/10 md:w-72 lg:w-80" }) => {
  const skeletonRows = Array(8).fill(null);

  return (
    <aside className={className} aria-busy="true" aria-label="Loading conversations">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        <div className="flex h-8 items-center justify-between">
          <div className="skeleton h-5 w-16 rounded-md" />
          <div className="flex gap-2">
            <div className="skeleton size-7 rounded-full" />
            <div className="skeleton size-7 rounded-full" />
          </div>
        </div>
        <div className="skeleton h-8 w-full rounded-lg" />
        <div className="flex items-center justify-between">
          <div className="skeleton h-3.5 w-24 rounded" />
          <div className="skeleton h-4 w-7 rounded-full" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-2">
        {skeletonRows.map((_, idx) => (
          <div key={idx} className="flex items-center gap-3 px-2.5 py-2">
            <div className="skeleton size-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className={`skeleton h-3.5 rounded ${idx % 3 === 0 ? "w-2/3" : idx % 3 === 1 ? "w-1/2" : "w-3/5"}`} />
              <div className="skeleton h-3 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;
