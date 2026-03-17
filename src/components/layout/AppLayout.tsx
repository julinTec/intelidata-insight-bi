import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { TrialBanner } from '@/components/ui/TrialBanner';
import { UpgradeOverlay } from '@/components/ui/UpgradeOverlay';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { hasAccess, isTrialing, hoursRemaining, isAdmin, isPaid, loading: subLoading } = useSubscription();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pl-64 min-h-screen">
        {isTrialing && !isAdmin && !isPaid && (
          <TrialBanner hoursRemaining={hoursRemaining} />
        )}
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      {!hasAccess && !isAdmin && <UpgradeOverlay />}
    </div>
  );
}
