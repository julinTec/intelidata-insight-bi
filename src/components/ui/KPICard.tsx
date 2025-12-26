import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  className?: string;
}

export function KPICard({
  title,
  value,
  description,
  trend,
  trendLabel,
  icon,
  variant = "default",
  className,
}: KPICardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    destructive: "border-destructive/30 bg-destructive/5",
    info: "border-info/30 bg-info/5",
  };

  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return <Minus className="h-4 w-4" />;
    return trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return "text-muted-foreground";
    return trend > 0 ? "text-success" : "text-destructive";
  };

  return (
    <div className={cn(
      "kpi-card group",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        
        {(trend !== undefined || description) && (
          <div className="flex items-center gap-2">
            {trend !== undefined && (
              <span className={cn("flex items-center gap-1 text-sm font-medium", getTrendColor())}>
                {getTrendIcon()}
                {Math.abs(trend).toFixed(1)}%
                {trendLabel && <span className="text-muted-foreground font-normal ml-1">{trendLabel}</span>}
              </span>
            )}
            {description && !trend && (
              <span className="text-sm text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
