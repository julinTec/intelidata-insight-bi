import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  LayoutTemplate, 
  DollarSign, 
  TrendingUp, 
  PiggyBank, 
  Wallet,
  ArrowRight,
  Loader2,
  BarChart3,
  LineChart,
  PieChart
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  kpis: string[];
  charts: string[];
  color: string;
}

const templates: Template[] = [
  {
    id: "revenue",
    name: "Dashboard de Receitas",
    description: "Acompanhe faturamento, crescimento e sazonalidade das vendas",
    category: "revenue",
    icon: <DollarSign className="h-6 w-6" />,
    kpis: ["Receita Total", "Ticket Médio", "Crescimento MoM", "Receita por Produto"],
    charts: ["Evolução mensal", "Top produtos", "Sazonalidade"],
    color: "from-success/20 to-success/5",
  },
  {
    id: "costs",
    name: "Dashboard de Custos",
    description: "Controle despesas operacionais e centros de custo",
    category: "costs",
    icon: <PiggyBank className="h-6 w-6" />,
    kpis: ["Custo Total", "Custo por Unidade", "Margem Bruta", "OPEX"],
    charts: ["Custos por categoria", "Evolução de custos", "Comparativo orçado x real"],
    color: "from-destructive/20 to-destructive/5",
  },
  {
    id: "indicators",
    name: "Dashboard de Indicadores",
    description: "KPIs de performance com metas vs realizado",
    category: "indicators",
    icon: <TrendingUp className="h-6 w-6" />,
    kpis: ["ROI", "EBITDA", "Margem Líquida", "Payback"],
    charts: ["Gauge de metas", "Tendências", "Comparativo períodos"],
    color: "from-primary/20 to-primary/5",
  },
  {
    id: "cashflow",
    name: "Dashboard de Fluxo de Caixa",
    description: "Entradas, saídas e projeções financeiras",
    category: "financial",
    icon: <Wallet className="h-6 w-6" />,
    kpis: ["Saldo Atual", "Entradas", "Saídas", "Projeção 30 dias"],
    charts: ["Waterfall de caixa", "DRE simplificado", "Projeção futura"],
    color: "from-info/20 to-info/5",
  },
];

export default function Templates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applying, setApplying] = useState<string | null>(null);

  const applyTemplate = async (template: Template) => {
    if (!user) return;

    setApplying(template.id);

    try {
      // Create project from template
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: template.name,
          description: template.description,
          category: template.category,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Projeto "${template.name}" criado!`);
      navigate(`/upload?project=${project.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao aplicar template");
    } finally {
      setApplying(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LayoutTemplate className="h-8 w-8 text-primary" />
            Templates Financeiros
          </h1>
          <p className="text-muted-foreground mt-2">
            Comece rapidamente com templates pré-configurados para análises financeiras
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="glass-card rounded-xl overflow-hidden hover:border-primary/30 transition-all group"
            >
              <div className={`p-6 bg-gradient-to-br ${template.color}`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-background/80 text-foreground">
                    {template.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">KPIs Incluídos</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.kpis.map((kpi, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-muted rounded-full"
                      >
                        {kpi}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Gráficos Sugeridos</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      {template.charts[0]}
                    </span>
                    <span className="flex items-center gap-1">
                      <LineChart className="h-4 w-4" />
                      {template.charts[1]}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => applyTemplate(template)}
                  disabled={applying === template.id}
                  className="w-full btn-gradient"
                >
                  {applying === template.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      Usar Template
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-info/10 text-info">
              <PieChart className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Como funcionam os templates?</h3>
              <p className="text-sm text-muted-foreground">
                Os templates criam um projeto pré-configurado com KPIs e gráficos sugeridos 
                para cada área. Após aplicar o template, você só precisa importar seus dados 
                e a IA adaptará as análises automaticamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
