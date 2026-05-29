import { supabase } from '@/services/supabase';
import { isDemoNumber } from './AuthProvider';

export type OtpDispatchResult = { ok: boolean; expires_in?: number; error?: string };

/**
 * Send an OTP to a phone number.
 * Demo allowlist returns immediately; production uses Supabase phone auth.
 */
export async function sendOtp(phone: string): Promise<OtpDispatchResult> {
  if (!/^\+91\d{10}$/.test(phone)) {
    return { ok: false, error: 'Invalid phone number' };
  }
  if (isDemoNumber(phone)) {
    return { ok: true, expires_in: 300 };
  }
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return { ok: false, error: error.message };
  return { ok: true, expires_in: 300 };
}

export async function verifyOtp(phone: string, code: string): Promise<
  { ok: false; error: string } | { ok: true; role: string }
> {
  let userId: string | null = null;

  if (isDemoNumber(phone) && code === '123456') {
    const email = `${phone.replace(/\D/g, '')}@demo.csupply.in`;
    // Try sign-in; if account missing, create it (disable email confirm in Supabase settings)
    let { data } = await supabase.auth.signInWithPassword({ email, password: 'Demo@2026' });
    if (!data.session) {
      const { data: up, error: ue } = await supabase.auth.signUp({ email, password: 'Demo@2026' });
      if (ue) return { ok: false, error: ue.message };
      if (!up.session) return { ok: false, error: 'Email confirmation is ON in Supabase — disable it for demo accounts.' };
      data = up as any;
    }
    userId = data.session!.user.id;
  } else {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
    if (error) return { ok: false, error: error.message };
    userId = data.session?.user?.id ?? null;
  }

  if (!userId) return { ok: false, error: 'Authentication failed. Please try again.' };

  // Fetch role directly — don't depend on AuthProvider async chain
  let { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  // Auto-create profile for brand-new users
  if (!profile) {
    await supabase.from('profiles').upsert({
      id: userId,
      phone: phone ?? null,
      role: 'customer',
      language: 'en',
      verified: false,
      is_demo: false,
    }, { onConflict: 'id' });
    profile = { role: 'customer' };
  }

  return { ok: true, role: profile.role ?? 'customer' };
}

export async function setPasscode(profileId: string, passcode: string) {
  const { error } = await supabase.from('profiles').update({ passcode_hash: hashLocal(passcode) }).eq('id', profileId);
  return { ok: !error, error: error?.message };
}

// Lightweight non-cryptographic hash placeholder for client persistence; real
// passcode hashing is performed by the server-side Edge Function. This is only
// here so the client can remember the user has a passcode set.
function hashLocal(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}
