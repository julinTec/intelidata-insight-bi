import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  Upload, 
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  FolderKanban,
  FileSpreadsheet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface Project {
  id: string;
  name: string;
  category: string;
  status: string;
  created_at: string;
}

// Sample data for charts
const revenueData = [
  { month: 'Jan', value: 45000 },
  { month: 'Fev', value: 52000 },
  { month: 'Mar', value: 48000 },
  { month: 'Abr', value: 61000 },
  { month: 'Mai', value: 55000 },
  { month: 'Jun', value: 67000 },
];

const expenseData = [
  { category: 'Operacional', value: 35000, color: 'hsl(210, 100%, 60%)' },
  { category: 'Marketing', value: 15000, color: 'hsl(165, 70%, 50%)' },
  { category: 'RH', value: 25000, color: 'hsl(280, 70%, 60%)' },
  { category: 'Tecnologia', value: 12000, color: 'hsl(40, 90%, 55%)' },
];

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'up' | 'down';
}

function KPICard({ title, value, change, icon: Icon, trend }: KPICardProps) {
  return (
    <Card className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-success' : 'text-destructive'}`}>
            {trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>{Math.abs(change)}% vs mês anterior</span>
          </div>
        </div>
        <div className={`p-3 rounded-xl ${trend === 'up' ? 'bg-success/10' : 'bg-destructive/10'}`}>
          <Icon className={`h-6 w-6 ${trend === 'up' ? 'text-success' : 'text-destructive'}`} />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error && data) {
        setProjects(data);
      }
      setLoading(false);
    }

    fetchProjects();
  }, [user]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Olá, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Aqui está um resumo dos seus indicadores financeiros.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload de Dados
              </Link>
            </Button>
            <Button className="btn-gradient" asChild>
              <Link to="/projects">
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Receita Total"
            value="R$ 328.500"
            change={12.5}
            icon={DollarSign}
            trend="up"
          />
          <KPICard
            title="Margem de Lucro"
            value="24.8%"
            change={3.2}
            icon={TrendingUp}
            trend="up"
          />
          <KPICard
            title="Custos Operacionais"
            value="R$ 87.200"
            change={-5.1}
            icon={TrendingDown}
            trend="down"
          />
          <KPICard
            title="ROI"
            value="18.3%"
            change={2.8}
            icon={BarChart3}
            trend="up"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card className="chart-container">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Evolução de Receita</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-accent" />
                  <span>Análise IA disponível</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(210, 100%, 60%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(210, 100%, 60%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(220, 15%, 60%)" 
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(220, 15%, 60%)" 
                      fontSize={12}
                      tickFormatter={(value) => `${value / 1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(220, 25%, 9%)',
                        border: '1px solid hsl(220, 20%, 16%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Receita']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(210, 100%, 60%)" 
                      strokeWidth={2}
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Chart */}
          <Card className="chart-container">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Despesas por Categoria</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver detalhes
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                    <XAxis 
                      type="number" 
                      stroke="hsl(220, 15%, 60%)" 
                      fontSize={12}
                      tickFormatter={(value) => `${value / 1000}k`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="category" 
                      stroke="hsl(220, 15%, 60%)" 
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(220, 25%, 9%)',
                        border: '1px solid hsl(220, 20%, 16%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Despesa']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="glass-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3" asChild>
                <Link to="/upload">
                  <Upload className="h-4 w-4 text-primary" />
                  Importar dados CSV/Excel
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" asChild>
                <Link to="/connections">
                  <PieChart className="h-4 w-4 text-accent" />
                  Conectar banco de dados
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" asChild>
                <Link to="/templates">
                  <FileSpreadsheet className="h-4 w-4 text-warning" />
                  Usar template financeiro
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" asChild>
                <Link to="/analyses">
                  <Sparkles className="h-4 w-4 text-success" />
                  Gerar análise com IA
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Projetos Recentes</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects">Ver todos</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse text-muted-foreground">Carregando...</div>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum projeto ainda</p>
                  <Button className="mt-4 btn-gradient" asChild>
                    <Link to="/projects">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar primeiro projeto
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FolderKanban className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{project.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{project.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.status === 'active' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {project.status === 'active' ? 'Ativo' : project.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
