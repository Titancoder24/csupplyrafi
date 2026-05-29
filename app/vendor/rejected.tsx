import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { KycStatusScreen, KycDocItem } from '@/components/ui/KycStatusScreen';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';

export default function VendorRejected() {
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
        .from('vendor_profiles')
        .select('created_at, gst_number, gst_certificate_url, pan_number, aadhaar_url, selfie_url, bank_account, bank_ifsc, shop_name, kyc_status, rejection_reason')
        .eq('id', profile.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setReason(data.rejection_reason);
      setSubmittedAt(data.created_at);
      setDocs([
        { label: 'Shop name',           provided: !!data.shop_name,           value: data.shop_name ?? undefined },
        { label: 'GST number',          provided: !!data.gst_number,          value: data.gst_number ?? undefined },
        { label: 'GST certificate',     provided: !!data.gst_certificate_url },
        { label: 'PAN',                 provided: !!data.pan_number,          value: data.pan_number ?? undefined },
        { label: 'Aadhaar',             provided: !!data.aadhaar_url },
        { label: 'Selfie',              provided: !!data.selfie_url },
        { label: 'Bank details',        provided: !!(data.bank_account && data.bank_ifsc) },
      ]);
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  async function retry() {
    if (!profile?.id) return;
    // Move status back to submitted so admin sees it in the queue again after re-upload
    await supabase.from('vendor_profiles').update({ kyc_status: 'draft', rejection_reason: null }).eq('id', profile.id);
    router.replace('/vendor/onboarding/1');
  }

  return (
    <KycStatusScreen
      variant="rejected"
      roleLabel="Vendor"
      submittedAt={submittedAt}
      rejectionReason={reason}
      docs={docs}
      onRetry={retry}
      onSignOut={signOut}
    />
  );
}
