import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (user clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ variant: "destructive", title: "Senha deve ter pelo menos 6 caracteres" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "As senhas não coincidem" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao redefinir senha", description: error.message });
    } else {
      setSuccess(true);
      toast({ title: "Senha redefinida com sucesso!" });
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md glass-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando link de recuperação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md glass-card border-border/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              {success ? (
                <CheckCircle className="h-8 w-8 text-primary" />
              ) : (
                <KeyRound className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {success ? "Senha Redefinida!" : "Nova Senha"}
          </CardTitle>
          <CardDescription>
            {success
              ? "Você será redirecionado em instantes..."
              : "Digite sua nova senha abaixo"}
          </CardDescription>
        </CardHeader>
        {!success && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-dark"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full btn-gradient" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redefinir Senha
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
