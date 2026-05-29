/**
 * useKycGate — Routes a vendor / transporter to pending / rejected /
 * onboarding based on their kyc_status.
 *
 * Once a user is approved, they are free to navigate anywhere under
 * /<role>/*. The gate only forces a redirect when:
 *   - status is submitted / under_review and user is OUTSIDE /<role>/pending
 *   - status is rejected and user is OUTSIDE /<role>/rejected
 *   - status is draft (or no row) and user is OUTSIDE /<role>/onboarding/*
 *
 * Also subscribes to realtime updates so an admin approval / rejection
 * lifts the user off the pending / rejected screens automatically.
 */
import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';

type Role = 'vendor' | 'transporter';

const TABLE: Record<Role, string> = {
  vendor: 'vendor_profiles',
  transporter: 'transporter_profiles',
};

function isAllowedForStatus(role: Role, pathname: string, status: string | null | undefined): boolean {
  // Approved users can roam anywhere except the gating screens
  if (status === 'approved') {
    return !(pathname === `/${role}/pending` || pathname === `/${role}/rejected` || pathname.startsWith(`/${role}/onboarding`));
  }
  // Submitted / under_review must stay on the pending screen
  if (status === 'submitted' || status === 'under_review') {
    return pathname === `/${role}/pending`;
  }
  // Rejected must stay on the rejected screen (or move into onboarding for retry)
  if (status === 'rejected') {
    return pathname === `/${role}/rejected` || pathname.startsWith(`/${role}/onboarding`);
  }
  // Draft / no row → must stay in onboarding
  return pathname.startsWith(`/${role}/onboarding`);
}

function redirectTarget(role: Role, status: string | null | undefined): string {
  if (status === 'submitted' || status === 'under_review') return `/${role}/pending`;
  if (status === 'rejected') return `/${role}/rejected`;
  if (status === 'approved') return `/${role}/dashboard`;
  return `/${role}/onboarding/1`;
}

export function useKycGate(role: Role) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading || !profile?.id) return;
    if (profile.role !== role) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from(TABLE[role])
        .select('kyc_status')
        .eq('id', profile.id)
        .maybeSingle();
      if (cancelled) return;
      const status = data?.kyc_status as string | undefined;
      if (isAllowedForStatus(role, pathname, status)) return;
      const target = redirectTarget(role, status);
      if (pathname === target) return;
      router.replace(target as never);
    })();

    return () => { cancelled = true; };
  }, [profile?.id, profile?.role, loading, role, pathname, router]);

  // Realtime: when admin changes our status, lift us off pending/rejected.
  // Never touch the user while they're already on an allowed page.
  useEffect(() => {
    if (!profile?.id || profile.role !== role) return;
    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase
      .channel(`kyc-gate:${role}:${profile.id}:${suffix}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: TABLE[role],
        filter: `id=eq.${profile.id}`,
      }, (p: any) => {
        const status = p.new?.kyc_status;
        // Only force a move if current location no longer fits the new status
        if (isAllowedForStatus(role, pathname, status)) return;
        const target = redirectTarget(role, status);
        router.replace(target as never);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id, profile?.role, role, router, pathname]);
}
