import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { KycStatusScreen, KycDocItem } from '@/components/ui/KycStatusScreen';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';

export default function TransporterRejected() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [reason, setReason] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [docs, setDocs] = useState<KycDocItem[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('transporter_profiles')
        .select('created_at, transporter_type, gst_number, driving_license_url, rc_url, insurance_url, aadhaar_url, bank_account, bank_ifsc, kyc_status, rejection_reason')
        .eq('id', profile.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setReason(data.rejection_reason);
      setSubmittedAt(data.created_at);
      setDocs([
        { label: 'Transporter type', provided: !!data.transporter_type, value: data.transporter_type ?? undefined },
        { label: 'GST number',       provided: !!data.gst_number,       value: data.gst_number ?? undefined },
        { label: 'Driving licence',  provided: !!data.driving_license_url },
        { label: 'RC',               provided: !!data.rc_url },
        { label: 'Insurance',        provided: !!data.insurance_url },
        { label: 'Aadhaar',          provided: !!data.aadhaar_url },
        { label: 'Bank details',     provided: !!(data.bank_account && data.bank_ifsc) },
      ]);
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  async function retry() {
    if (!profile?.id) return;
    await supabase.from('transporter_profiles').update({ kyc_status: 'draft', rejection_reason: null }).eq('id', profile.id);
    router.replace('/transporter/onboarding/1');
  }

  return (
    <KycStatusScreen
      variant="rejected"
      roleLabel="Transporter"
      submittedAt={submittedAt}
      rejectionReason={reason}
      docs={docs}
      onRetry={retry}
      onSignOut={signOut}
    />
  );
}
