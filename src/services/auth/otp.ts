import { supabase } from '@/services/supabase';

export type OtpDispatchResult = { ok: boolean; expires_in?: number; error?: string };

export function isDemoNumber(phone: string): boolean {
  const clean = phone.replace(/\D/g, '');
  return clean.startsWith('91900000000');
}

/**
 * Send an OTP to a phone number via Supabase Auth.
 * Falls back to bypass SMS delivery for predefined demo numbers.
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

/**
 * Verify an OTP code.
 * Uses a silent password login for demo numbers, and standard Supabase SMS OTP for real numbers.
 */
export async function verifyOtp(phone: string, code: string): Promise<
  { ok: false; error: string } | { ok: true; role: string; userId: string; passcodeHash: string | null }
> {
  let userId: string | null = null;

  if (isDemoNumber(phone)) {
    if (code !== '123456') {
      return { ok: false, error: 'Invalid OTP. For demo numbers, use 123456.' };
    }
    const email = `${phone.replace(/\D/g, '')}@demo.csupply.in`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'Demo@2026',
    });
    if (error) return { ok: false, error: error.message };
    userId = data.session?.user?.id ?? null;
  } else {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    if (error) return { ok: false, error: error.message };
    userId = data.session?.user?.id ?? null;
  }

  if (!userId) return { ok: false, error: 'Authentication failed. Please try again.' };

  // Fetch role & passcode_hash
  let profile: { role: string; passcode_hash: string | null } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: p } = await supabase
      .from('profiles')
      .select('role, passcode_hash')
      .eq('id', userId)
      .maybeSingle();
    if (p) {
      profile = p;
      break;
    }
    if (attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Fallback for standard demo accounts to prevent RLS/session race conditions on local devices
  let passcodeHash = profile?.passcode_hash ?? null;
  if (!passcodeHash && isDemoNumber(phone)) {
    if (phone === '+919000000001') passcodeHash = '7c540741'; // '1234' hash
    if (phone === '+919000000002') passcodeHash = '7c540741'; // '1234' hash
    if (phone === '+919000000003') passcodeHash = '7c5155c1'; // '4321' hash
  }

  return { 
    ok: true, 
    role: profile?.role ?? (phone === '+919000000002' ? 'vendor' : phone === '+919000000003' ? 'transporter' : 'customer'), 
    userId, 
    passcodeHash 
  };
}

export async function setPasscode(profileId: string, passcode: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ passcode_hash: hashLocal(passcode) })
    .eq('id', profileId);
  return { ok: !error, error: error?.message };
}

export function hashLocal(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}


