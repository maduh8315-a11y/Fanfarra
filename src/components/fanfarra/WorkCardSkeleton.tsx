import { Skeleton } from "@/components/ui/skeleton";

export function WorkCardSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Skeleton style={{ aspectRatio: "2/3", width: "100%", borderRadius: 12 }} />
      <Skeleton style={{ height: 14, width: "80%" }} />
      <Skeleton style={{ height: 12, width: "50%" }} />
    </div>
  );
}

export function WorkGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <WorkCardSkeleton key={i} />
      ))}
    </div>
  );
}