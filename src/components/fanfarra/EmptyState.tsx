import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  emoji?: string;
  iconColor?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  emoji,
  iconColor = "var(--fan-rose-mid)",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className
      )}
    >
      {Icon && <Icon size={40} color={iconColor} strokeWidth={1.5} className="mb-3" />}
      {emoji && <span className="text-4xl mb-3">{emoji}</span>}
      <p
        className={cn("text-sm", description && "font-semibold")}
        style={{ color: description ? "var(--fan-text)" : "var(--fan-text-2)" }}
      >
        {title}
      </p>
      {description && (
        <p className="text-sm mt-1 max-w-[260px]" style={{ color: "var(--fan-text-2)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}