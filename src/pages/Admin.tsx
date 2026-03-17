import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Users, FolderKanban, BarChart3, Shield, ShieldCheck, ShieldX,
  Search, CreditCard, Clock, AlertTriangle, Pencil, Trash2,
  CheckCircle, XCircle, DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_paid: boolean;
  subscription_status: string;
  plan_type: string | null;
  trial_expires_at: string | null;
  paid_until: string | null;
  payment_notes: string | null;
  role: 'admin' | 'user';
  projects_count: number;
}

interface GlobalStats {
  totalUsers: number;
  totalProjects: number;
  totalAnalyses: number;
  paidUsers: number;
  trialActive: number;
  trialExpired: number;
}

type FilterType = 'all' | 'paid' | 'trial_active' | 'trial_expired' | 'unpaid';

export default function Admin() {
  const { isAdmin, loading: roleLoading } = useRole();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<GlobalStats>({ totalUsers: 0, totalProjects: 0, totalAnalyses: 0, paidUsers: 0, trialActive: 0, trialExpired: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Edit dialog
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    is_paid: false,
    subscription_status: 'trial',
    plan_type: '',
    paid_until: '',
    payment_notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      navigate('/dashboard');
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, projectsRes, analysesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, created_at, is_paid, subscription_status, plan_type, trial_expires_at, paid_until, payment_notes'),
        supabase.from('projects').select('id, user_id'),
        supabase.from('analyses').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const profiles = profilesRes.data || [];
      const projects = projectsRes.data || [];
      const roles = rolesRes.data || [];
      const now = new Date();

      const projectsPerUser = projects.reduce((acc, p) => {
        acc[p.user_id] = (acc[p.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const rolesMap = roles.reduce((acc, r) => {
        if (r.role === 'admin') acc[r.user_id] = 'admin';
        else if (!acc[r.user_id]) acc[r.user_id] = r.role as 'admin' | 'user';
        return acc;
      }, {} as Record<string, 'admin' | 'user'>);

      const usersData: UserRow[] = profiles.map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        is_paid: p.is_paid,
        subscription_status: p.subscription_status,
        plan_type: p.plan_type,
        trial_expires_at: p.trial_expires_at,
        paid_until: p.paid_until,
        payment_notes: p.payment_notes,
        role: rolesMap[p.id] || 'user',
        projects_count: projectsPerUser[p.id] || 0,
      }));

      let paidUsers = 0, trialActive = 0, trialExpired = 0;
      usersData.forEach(u => {
        if (u.is_paid) paidUsers++;
        else if (u.trial_expires_at && new Date(u.trial_expires_at) > now) trialActive++;
        else trialExpired++;
      });

      setUsers(usersData);
      setStats({
        totalUsers: profiles.length,
        totalProjects: projects.length,
        totalAnalyses: analysesRes.count || 0,
        paidUsers,
        trialActive,
        trialExpired,
      });
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      toast.error('Erro ao carregar dados administrativos');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const now = new Date();
    let list = users;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.full_name?.toLowerCase().includes(q)) || u.email.toLowerCase().includes(q)
      );
    }

    switch (filter) {
      case 'paid':
        return list.filter(u => u.is_paid);
      case 'trial_active':
        return list.filter(u => !u.is_paid && u.trial_expires_at && new Date(u.trial_expires_at) > now);
      case 'trial_expired':
        return list.filter(u => !u.is_paid && (!u.trial_expires_at || new Date(u.trial_expires_at) <= now));
      case 'unpaid':
        return list.filter(u => !u.is_paid);
      default:
        return list;
    }
  }, [users, search, filter]);

  const openEdit = (user: UserRow) => {
    setEditUser(user);
    setEditForm({
      is_paid: user.is_paid,
      subscription_status: user.subscription_status || 'trial',
      plan_type: user.plan_type || '',
      paid_until: user.paid_until ? user.paid_until.slice(0, 10) : '',
      payment_notes: user.payment_notes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_paid: editForm.is_paid,
          subscription_status: editForm.subscription_status,
          plan_type: editForm.plan_type || null,
          paid_until: editForm.paid_until || null,
          payment_notes: editForm.payment_notes || null,
        })
        .eq('id', editUser.id);

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === editUser.id
          ? { ...u, is_paid: editForm.is_paid, subscription_status: editForm.subscription_status, plan_type: editForm.plan_type || null, paid_until: editForm.paid_until || null, payment_notes: editForm.payment_notes || null }
          : u
      ));
      toast.success('Dados de pagamento atualizados');
      setEditUser(null);
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickTogglePaid = async (user: UserRow) => {
    const newPaid = !user.is_paid;
    try {
      const updates: Record<string, any> = {
        is_paid: newPaid,
        subscription_status: newPaid ? 'active' : 'expired',
      };
      if (newPaid && !user.paid_until) {
        const oneMonth = new Date();
        oneMonth.setMonth(oneMonth.getMonth() + 1);
        updates.paid_until = oneMonth.toISOString();
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, ...updates } : u
      ));
      toast.success(newPaid ? 'Usuário marcado como pago' : 'Pagamento removido');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role alterada para ${newRole === 'admin' ? 'Admin' : 'Usuário'}`);
    } catch (err: any) {
      toast.error('Erro ao alterar role');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { userId: deleteUser.id },
      });
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      toast.success('Usuário excluído com sucesso');
      setDeleteUser(null);
      setDeleteConfirmText('');
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (user: UserRow) => {
    const now = new Date();
    if (user.is_paid) {
      const expired = user.paid_until && new Date(user.paid_until) <= now;
      return expired
        ? <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pagamento vencido</Badge>
        : <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
    }
    if (user.trial_expires_at && new Date(user.trial_expires_at) > now) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Trial ativo</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Expirado</Badge>;
  };

  if (roleLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários, assinaturas e permissões</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total Usuários', value: stats.totalUsers, icon: Users },
            { label: 'Pagos', value: stats.paidUsers, icon: DollarSign },
            { label: 'Trial Ativo', value: stats.trialActive, icon: Clock },
            { label: 'Trial Expirado', value: stats.trialExpired, icon: AlertTriangle },
            { label: 'Projetos', value: stats.totalProjects, icon: FolderKanban },
            { label: 'Análises', value: stats.totalAnalyses, icon: BarChart3 },
          ].map(s => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">{s.label}</CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-7 w-14" /> : <div className="text-2xl font-bold">{s.value}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Usuários</CardTitle>
            <CardDescription>Controle de assinaturas, trial e permissões</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="trial_active">Trial ativo</SelectItem>
                  <SelectItem value="trial_expired">Trial expirado</SelectItem>
                  <SelectItem value="unpaid">Não pagos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Pago até</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>{format(new Date(user.created_at), 'dd/MM/yy', { locale: ptBR })}</TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell>
                          <span className="text-sm">{user.plan_type || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {user.paid_until
                            ? format(new Date(user.paid_until), 'dd/MM/yy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}>
                            {user.role === 'admin' ? <><ShieldCheck className="h-3 w-3 mr-1" />Admin</> : 'Usuário'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={user.is_paid ? 'Remover pagamento' : 'Marcar como pago'}
                              onClick={() => handleQuickTogglePaid(user)}
                            >
                              <CreditCard className={`h-4 w-4 ${user.is_paid ? 'text-green-500' : 'text-muted-foreground'}`} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteUser(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
            <DialogDescription>{editUser?.full_name || editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label className="w-32">Pago</Label>
              <Button
                variant={editForm.is_paid ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditForm(f => ({ ...f, is_paid: !f.is_paid, subscription_status: !f.is_paid ? 'active' : 'expired' }))}
              >
                {editForm.is_paid ? 'Sim ✓' : 'Não'}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-32">Status</Label>
              <Select value={editForm.subscription_status} onValueChange={v => setEditForm(f => ({ ...f, subscription_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-32">Plano</Label>
              <Input value={editForm.plan_type} onChange={e => setEditForm(f => ({ ...f, plan_type: e.target.value }))} placeholder="ex: mensal, anual" />
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-32">Pago até</Label>
              <Input type="date" value={editForm.paid_until} onChange={e => setEditForm(f => ({ ...f, paid_until: e.target.value }))} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={editForm.payment_notes} onChange={e => setEditForm(f => ({ ...f, payment_notes: e.target.value }))} placeholder="Notas administrativas..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => { setDeleteUser(null); setDeleteConfirmText(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é irreversível. Todos os dados de <strong>{deleteUser?.email}</strong> serão excluídos.
              <br /><br />
              Digite <strong>EXCLUIR</strong> para confirmar:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="EXCLUIR" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmText !== 'EXCLUIR' || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
