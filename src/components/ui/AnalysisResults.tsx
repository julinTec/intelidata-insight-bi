import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "@/components/ui/KPICard";
import { SQLViewer } from "@/components/ui/SQLViewer";
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  DollarSign, 
  Percent,
  Target,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KPI {
  name: string;
  description: string;
  formula: string;
  chartType: string;
  sql?: string;
  dax?: string;
}

interface ChartSuggestion {
  type: string;
  title: string;
  description: string;
  dataFields: string[];
}

interface Query {
  name: string;
  sql?: string;
  dax?: string;
}

interface AnalysisResultsProps {
  kpis?: KPI[];
  charts?: ChartSuggestion[];
  insights?: string[];
  queries?: Query[];
  viewMode?: "executive" | "analyst";
  className?: string;
}

const chartIcons: Record<string, React.ReactNode> = {
  bar: <BarChart3 className="h-5 w-5" />,
  line: <LineChart className="h-5 w-5" />,
  pie: <PieChart className="h-5 w-5" />,
  area: <TrendingUp className="h-5 w-5" />,
};

const kpiIcons = [DollarSign, Percent, Target, TrendingUp];

export function AnalysisResults({
  kpis = [],
  charts = [],
  insights = [],
  queries = [],
  viewMode = "executive",
  className,
}: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState("kpis");

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="kpis">KPIs ({kpis.length})</TabsTrigger>
          <TabsTrigger value="charts">Gráficos ({charts.length})</TabsTrigger>
          <TabsTrigger value="insights">Insights ({insights.length})</TabsTrigger>
          <TabsTrigger value="queries">Queries ({queries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((kpi, index) => {
              const Icon = kpiIcons[index % kpiIcons.length];
              return (
                <div key={index} className="space-y-3">
                  <KPICard
                    title={kpi.name}
                    value={kpi.formula}
                    description={kpi.description}
                    icon={<Icon className="h-5 w-5" />}
                  />
                  {viewMode === "analyst" && (kpi.sql || kpi.dax) && (
                    <div className="space-y-2">
                      {kpi.sql && <SQLViewer code={kpi.sql} language="sql" title="SQL" />}
                      {kpi.dax && <SQLViewer code={kpi.dax} language="dax" title="DAX" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {kpis.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum KPI sugerido</p>
          )}
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {charts.map((chart, index) => (
              <div key={index} className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {chartIcons[chart.type.toLowerCase()] || <BarChart3 className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-semibold">{chart.title}</h4>
                    <p className="text-xs text-muted-foreground uppercase">{chart.type}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{chart.description}</p>
                <div className="flex flex-wrap gap-2">
                  {chart.dataFields.map((field, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs bg-muted rounded-full">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {charts.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum gráfico sugerido</p>
          )}
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="flex gap-3 p-4 glass-card rounded-xl">
                <div className="p-2 rounded-lg bg-warning/10 text-warning h-fit">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
          {insights.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum insight gerado</p>
          )}
        </TabsContent>

        <TabsContent value="queries" className="mt-6">
          <div className="space-y-4">
            {queries.map((query, index) => (
              <div key={index} className="space-y-2">
                <h4 className="font-medium">{query.name}</h4>
                {query.sql && <SQLViewer code={query.sql} language="sql" />}
                {query.dax && <SQLViewer code={query.dax} language="dax" />}
              </div>
            ))}
          </div>
          {queries.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhuma query gerada</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
