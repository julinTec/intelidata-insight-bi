import { useEffect, useState } from "react";
import { KPICard } from "./KPICard";
import { useDataSource } from "@/hooks/useDataSource";
import { Skeleton } from "./skeleton";
import { 
  DollarSign, 
  Percent, 
  Target, 
  TrendingUp, 
  Hash,
  ShoppingCart,
  Users,
  Package
} from "lucide-react";

export interface WidgetConfig {
  field?: string;
  aggregation?: "sum" | "count" | "avg" | "min" | "max";
  format?: "currency" | "number" | "percent";
  icon?: string;
}

export interface DynamicKPIProps {
  title: string;
  dataSourceId: string;
  config: WidgetConfig | Record<string, unknown>;
  className?: string;
  filters?: Record<string, unknown>;
}

const iconMap: Record<string, React.ReactNode> = {
  dollar: <DollarSign className="h-5 w-5" />,
  percent: <Percent className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  trending: <TrendingUp className="h-5 w-5" />,
  hash: <Hash className="h-5 w-5" />,
  cart: <ShoppingCart className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  package: <Package className="h-5 w-5" />,
};

export function DynamicKPI({ title, dataSourceId, config, className, filters }: DynamicKPIProps) {
  const { fetchData, getDataSource, loading } = useDataSource();
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Normalize config
  const normalizedConfig: WidgetConfig = {
    field: config.field as string | undefined,
    aggregation: (config.aggregation as WidgetConfig["aggregation"]) || "count",
    format: (config.format as WidgetConfig["format"]) || "number",
    icon: config.icon as string | undefined,
  };

  useEffect(() => {
    async function loadData() {
      try {
        const dataSource = await getDataSource(dataSourceId);
        if (!dataSource) {
          setError("Fonte de dados não encontrada");
          return;
        }

        let records = await fetchData(dataSource);
        
        // Apply filters if provided
        if (filters && Object.keys(filters).length > 0) {
          records = applyFiltersToData(records, filters);
        }
        
        if (records.length === 0) {
          setValue("0");
          return;
        }

        const calculatedValue = calculateValue(records, normalizedConfig);
        setValue(formatValue(calculatedValue, normalizedConfig.format));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      }
    }

    loadData();
  }, [dataSourceId, config, filters, fetchData, getDataSource]);

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (error) {
    return (
      <KPICard
        title={title}
        value="Erro"
        description={error}
        variant="destructive"
        className={className}
      />
    );
  }

  const icon = normalizedConfig.icon ? iconMap[normalizedConfig.icon] : iconMap.hash;

  return (
    <KPICard
      title={title}
      value={value}
      icon={icon}
      className={className}
    />
  );
}

// Helper to apply filters
function applyFiltersToData(
  data: Record<string, unknown>[],
  filters: Record<string, unknown>
): Record<string, unknown>[] {
  if (!filters || Object.keys(filters).length === 0) return data;

  return data.filter((row) => {
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === "" || value === "all") continue;

      if (key.endsWith("_min")) {
        const field = key.replace("_min", "");
        const rowValue = Number(row[field]);
        if (!isNaN(rowValue) && rowValue < Number(value)) return false;
      } else if (key.endsWith("_max")) {
        const field = key.replace("_max", "");
        const rowValue = Number(row[field]);
        if (!isNaN(rowValue) && rowValue > Number(value)) return false;
      } else if (key.endsWith("_from")) {
        const field = key.replace("_from", "");
        const rowDate = new Date(row[field] as string);
        const filterDate = new Date(value as string);
        if (rowDate < filterDate) return false;
      } else if (key.endsWith("_to")) {
        const field = key.replace("_to", "");
        const rowDate = new Date(row[field] as string);
        const filterDate = new Date(value as string);
        if (rowDate > filterDate) return false;
      } else {
        const rowValue = String(row[key] ?? "").toLowerCase();
        const filterValue = String(value).toLowerCase();
        if (!rowValue.includes(filterValue)) return false;
      }
    }
    return true;
  });
}

function calculateValue(records: Record<string, unknown>[], config: WidgetConfig): number {
  const { field, aggregation = "count" } = config;

  if (aggregation === "count") {
    return records.length;
  }

  if (!field) {
    return records.length;
  }

  const values = records
    .map((r) => {
      const val = r[field];
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const parsed = parseFloat(val.replace(/[^0-9.-]/g, ""));
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    })
    .filter((v) => !isNaN(v));

  if (values.length === 0) return 0;

  switch (aggregation) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    default:
      return values.length;
  }
}

function formatValue(value: number, format?: string): string {
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    case "percent":
      return `${value.toFixed(1)}%`;
    case "number":
    default:
      return new Intl.NumberFormat("pt-BR").format(value);
  }
}
