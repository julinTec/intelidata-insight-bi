import { useEffect, useState } from "react";
import { useDataSource } from "@/hooks/useDataSource";
import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

export interface ChartConfig {
  chartType: "bar" | "line" | "area" | "pie";
  xField?: string;
  yField?: string;
  groupBy?: string;
  aggregation?: "sum" | "count" | "avg";
}

export interface DynamicChartProps {
  title: string;
  dataSourceId: string;
  config: ChartConfig | Record<string, unknown>;
  className?: string;
  filters?: Record<string, unknown>;
}

const COLORS = [
  "hsl(210, 100%, 60%)",
  "hsl(165, 70%, 50%)",
  "hsl(280, 70%, 60%)",
  "hsl(40, 90%, 55%)",
  "hsl(350, 80%, 60%)",
  "hsl(120, 60%, 50%)",
];

export function DynamicChart({ title, dataSourceId, config, className, filters }: DynamicChartProps) {
  const { fetchData, getDataSource, loading } = useDataSource();
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Normalize config
  const normalizedConfig: ChartConfig = {
    chartType: (config.chartType as ChartConfig["chartType"]) || "bar",
    xField: config.xField as string | undefined,
    yField: config.yField as string | undefined,
    groupBy: config.groupBy as string | undefined,
    aggregation: (config.aggregation as ChartConfig["aggregation"]) || "count",
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
          setChartData([]);
          return;
        }

        const processed = processDataForChart(records, normalizedConfig);
        setChartData(processed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      }
    }

    loadData();
  }, [dataSourceId, config, filters, fetchData, getDataSource]);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem dados para exibir</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(normalizedConfig.chartType, chartData, normalizedConfig)}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
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

function processDataForChart(
  records: Record<string, unknown>[],
  config: ChartConfig
): Record<string, unknown>[] {
  const { groupBy, yField, aggregation = "count" } = config;

  if (!groupBy) {
    // Return raw data limited to 20 records
    return records.slice(0, 20);
  }

  // Group by field
  const groups: Record<string, number[]> = {};

  records.forEach((record) => {
    const key = String(record[groupBy] || "Outros");
    if (!groups[key]) {
      groups[key] = [];
    }

    if (yField && record[yField] !== undefined) {
      const val = record[yField];
      const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ""));
      if (!isNaN(num)) {
        groups[key].push(num);
      }
    } else {
      groups[key].push(1);
    }
  });

  return Object.entries(groups)
    .map(([name, values]) => {
      let value: number;
      switch (aggregation) {
        case "sum":
          value = values.reduce((a, b) => a + b, 0);
          break;
        case "avg":
          value = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case "count":
        default:
          value = values.length;
      }
      return { name, value };
    })
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 10);
}

function renderChart(
  chartType: string,
  data: Record<string, unknown>[],
  config: ChartConfig
) {
  const xKey = config.xField || "name";
  const yKey = config.yField || "value";

  const tooltipStyle = {
    backgroundColor: "hsl(220, 25%, 9%)",
    border: "1px solid hsl(220, 20%, 16%)",
    borderRadius: "8px",
  };

  switch (chartType) {
    case "line":
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
          <XAxis dataKey={xKey} stroke="hsl(220, 15%, 60%)" fontSize={12} />
          <YAxis stroke="hsl(220, 15%, 60%)" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={COLORS[0]}
            strokeWidth={2}
            dot={{ fill: COLORS[0] }}
          />
        </LineChart>
      );

    case "area":
      return (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
          <XAxis dataKey={xKey} stroke="hsl(220, 15%, 60%)" fontSize={12} />
          <YAxis stroke="hsl(220, 15%, 60%)" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={COLORS[0]}
            strokeWidth={2}
            fill="url(#colorValue)"
          />
        </AreaChart>
      );

    case "pie":
      return (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            dataKey={yKey}
            nameKey={xKey}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
        </PieChart>
      );

    case "bar":
    default:
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
          <XAxis dataKey={xKey} stroke="hsl(220, 15%, 60%)" fontSize={12} />
          <YAxis stroke="hsl(220, 15%, 60%)" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      );
  }
}
