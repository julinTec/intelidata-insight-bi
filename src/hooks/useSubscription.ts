import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useRole } from './useRole';

interface SubscriptionState {
  hasAccess: boolean;
  isTrialing: boolean;
  trialExpired: boolean;
  hoursRemaining: number;
  isPaid: boolean;
  isAdmin: boolean;
  subscriptionStatus: string | null;
  planType: string | null;
  loading: boolean;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const [profile, setProfile] = useState<{
    is_paid: boolean;
    trial_expires_at: string | null;
    paid_until: string | null;
    subscription_status: string | null;
    plan_type: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_paid, trial_expires_at, paid_until, subscription_status, plan_type')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const now = new Date();

  const trialExpiresAt = profile?.trial_expires_at ? new Date(profile.trial_expires_at) : null;
  const paidUntil = profile?.paid_until ? new Date(profile.paid_until) : null;

  const isTrialing = !!(trialExpiresAt && trialExpiresAt > now && !profile?.is_paid);
  const trialExpired = !!(trialExpiresAt && trialExpiresAt <= now);
  const isPaid = !!(profile?.is_paid && paidUntil && paidUntil > now);

  const hoursRemaining = trialExpiresAt
    ? Math.max(0, Math.round((trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10)
    : 0;

  let hasAccess = false;
  if (isAdmin) hasAccess = true;
  else if (isPaid) hasAccess = true;
  else if (isTrialing) hasAccess = true;

  return {
    hasAccess,
    isTrialing,
    trialExpired,
    hoursRemaining,
    isPaid,
    isAdmin,
    subscriptionStatus: profile?.subscription_status ?? null,
    planType: profile?.plan_type ?? null,
    loading: loading || roleLoading,
  };
}
