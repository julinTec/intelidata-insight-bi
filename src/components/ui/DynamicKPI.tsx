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

interface WidgetConfig {
  field?: string;
  aggregation?: "sum" | "count" | "avg" | "min" | "max";
  format?: "currency" | "number" | "percent";
  icon?: string;
}

interface DynamicKPIProps {
  title: string;
  dataSourceId: string;
  config: WidgetConfig;
  className?: string;
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

export function DynamicKPI({ title, dataSourceId, config, className }: DynamicKPIProps) {
  const { fetchData, getDataSource, loading } = useDataSource();
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const dataSource = await getDataSource(dataSourceId);
        if (!dataSource) {
          setError("Fonte de dados não encontrada");
          return;
        }

        const records = await fetchData(dataSource);
        if (records.length === 0) {
          setValue("0");
          return;
        }

        const calculatedValue = calculateValue(records, config);
        setValue(formatValue(calculatedValue, config.format));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      }
    }

    loadData();
  }, [dataSourceId, config, fetchData, getDataSource]);

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

  const icon = config.icon ? iconMap[config.icon] : iconMap.hash;

  return (
    <KPICard
      title={title}
      value={value}
      icon={icon}
      className={className}
    />
  );
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
