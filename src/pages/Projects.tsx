import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  FolderKanban, 
  Plus, 
  Loader2, 
  MoreVertical, 
  Pencil, 
  Trash2,
  FileSpreadsheet,
  BarChart3,
  LayoutDashboard,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string | null;
  created_at: string;
}

const categories = [
  { value: "financial", label: "Financeiro" },
  { value: "revenue", label: "Receitas" },
  { value: "costs", label: "Custos" },
  { value: "indicators", label: "Indicadores" },
  { value: "budget", label: "Orçamento" },
  { value: "general", label: "Geral" },
];

const statuses = [
  { value: "active", label: "Ativo", color: "bg-success" },
  { value: "archived", label: "Arquivado", color: "bg-muted-foreground" },
  { value: "in_progress", label: "Em Andamento", color: "bg-warning" },
];

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "general",
    status: "active",
  });

  const loadProjects = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar projetos");
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !formData.name.trim()) {
      toast.error("Nome do projeto é obrigatório");
      return;
    }

    setSaving(true);

    try {
      if (editingProject) {
        const { error } = await supabase
          .from("projects")
          .update({
            name: formData.name,
            description: formData.description || null,
            category: formData.category,
            status: formData.status,
          })
          .eq("id", editingProject.id);

        if (error) throw error;
        toast.success("Projeto atualizado!");
      } else {
        const { data, error } = await supabase.from("projects").insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          status: formData.status,
        }).select().single();

        if (error) throw error;
        toast.success("Projeto criado!");
        
        // Navigate to the new project
        if (data) {
          navigate(`/projects/${data.id}`);
          return;
        }
      }

      setDialogOpen(false);
      setEditingProject(null);
      setFormData({ name: "", description: "", category: "general", status: "active" });
      loadProjects();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar projeto");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      category: project.category || "general",
      status: project.status || "active",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Tem certeza que deseja excluir este projeto?")) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir projeto");
    } else {
      toast.success("Projeto excluído!");
      loadProjects();
    }
  };

  const getCategoryLabel = (value: string | null) => 
    categories.find((c) => c.value === value)?.label || "Geral";

  const getStatusInfo = (value: string | null) => 
    statuses.find((s) => s.value === value) || statuses[0];

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FolderKanban className="h-8 w-8 text-primary" />
              Projetos
            </h1>
            <p className="text-muted-foreground mt-2">
              Organize suas análises em projetos
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingProject(null);
              setFormData({ name: "", description: "", category: "general", status: "active" });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="btn-gradient">
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border">
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? "Editar Projeto" : "Novo Projeto"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Projeto</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Análise Vendas 2024"
                    className="input-dark"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o objetivo do projeto..."
                    className="input-dark resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="input-dark">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="input-dark">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving} className="btn-gradient">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : editingProject ? "Atualizar" : "Criar Projeto"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <FolderKanban className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum projeto ainda</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro projeto para começar a organizar suas análises
            </p>
            <Button onClick={() => setDialogOpen(true)} className="btn-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Criar Projeto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const statusInfo = getStatusInfo(project.status);
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block group"
                >
                  <div className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all h-full cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <FolderKanban className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {getCategoryLabel(project.category)}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleEdit(e as unknown as React.MouseEvent, project)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => handleDelete(e as unknown as React.MouseEvent, project.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color} text-background`}>
                        {statusInfo.label}
                      </span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/upload?project=${project.id}`);
                          }}
                        >
                          <FileSpreadsheet className="h-3 w-3 mr-1" />
                          Dados
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/projects/${project.id}/dashboard`);
                          }}
                        >
                          <LayoutDashboard className="h-3 w-3 mr-1" />
                          Dashboard
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/analyses?project=${project.id}`);
                          }}
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Análises
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
