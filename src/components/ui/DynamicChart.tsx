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

interface ChartConfig {
  chartType: "bar" | "line" | "area" | "pie";
  xField?: string;
  yField?: string;
  groupBy?: string;
  aggregation?: "sum" | "count" | "avg";
}

interface DynamicChartProps {
  title: string;
  dataSourceId: string;
  config: ChartConfig;
  className?: string;
}

const COLORS = [
  "hsl(210, 100%, 60%)",
  "hsl(165, 70%, 50%)",
  "hsl(280, 70%, 60%)",
  "hsl(40, 90%, 55%)",
  "hsl(350, 80%, 60%)",
  "hsl(120, 60%, 50%)",
];

export function DynamicChart({ title, dataSourceId, config, className }: DynamicChartProps) {
  const { fetchData, getDataSource, loading } = useDataSource();
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
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
          setChartData([]);
          return;
        }

        const processed = processDataForChart(records, config);
        setChartData(processed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      }
    }

    loadData();
  }, [dataSourceId, config, fetchData, getDataSource]);

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
            {renderChart(config.chartType, chartData, config)}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
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
