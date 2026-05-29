import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Lock, Phone, ShieldCheck, Upload } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { StepProgress } from '@/components/ui/StepProgress';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { RadioCard } from '@/components/ui/RadioCard';
import { StickyCta } from '@/components/ui/StickyCta';
import { useTheme } from '@/theme/ThemeProvider';
import { useTransporterOnboarding } from '@/features/transporter/onboarding-store';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';

const TOTAL = 12;
const TITLES = [
  'Welcome',
  'Enter Mobile',
  'Join As',
  'GST Details',
  'Vehicle Details',
  'Upload Documents',
  'Set Passcode',
  'Call Masking',
  'Available for Jobs',
  'Job Request',
  'On The Way',
  'Delivery & Proof',
];

export default function TransporterStep() {
  const { tokens } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const o = useTransporterOnboarding();
  const { step } = useLocalSearchParams<{ step: string }>();
  const n = Math.max(1, Math.min(TOTAL, parseInt(step ?? '1', 10) || 1));
  const [submitting, setSubmitting] = useState(false);

  async function submitKyc() {
    if (!profile?.id) {
      router.replace('/auth/login');
      return;
    }
    setSubmitting(true);
    try {
      await supabase.from('transporter_profiles').upsert({
        id: profile.id,
        transporter_type:    o.type ?? null,
        gst_number:          o.gstNumber ?? null,
        driving_license_url: o.dlUrl ?? null,
        rc_url:              o.rcUrl ?? null,
        insurance_url:       o.insuranceUrl ?? null,
        kyc_status:          'submitted',
      });
      router.replace('/transporter/pending');
    } finally {
      setSubmitting(false);
    }
  }

  const next = () => {
    if (n === 7) {
      submitKyc();
      return;
    }
    if (n === TOTAL) {
      router.replace('/transporter/dashboard');
      return;
    }
    router.push(`/transporter/onboarding/${n + 1}` as never);
  };
  const prev = () => (n > 1 ? router.push(`/transporter/onboarding/${n - 1}` as never) : router.back());

  return (
    <Screen scroll={false} bottomBarHeight={84}>
      <Header title={TITLES[n - 1]} onBack={prev} />
      {n <= 7 ? <StepProgress step={n} total={7} /> : null}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        {n === 1 ? <Step1 /> : null}
        {n === 2 ? <Step2 /> : null}
        {n === 3 ? <Step3 /> : null}
        {n === 4 ? <Step4 /> : null}
        {n === 5 ? <Step5 /> : null}
        {n === 6 ? <Step6 /> : null}
        {n === 7 ? <Step7 /> : null}
        {n === 8 ? <Step8 /> : null}
        {n === 9 ? <Step9 /> : null}
        {n === 10 ? <Step10 /> : null}
        {n === 11 ? <Step11 /> : null}
        {n === 12 ? <Step12 /> : null}
      </ScrollView>
      <StickyCta>
        {n === 7 ? (
          <Button label={submitting ? 'Submitting…' : 'Submit for Approval'} onPress={next} disabled={submitting} />
        ) : n === 8 ? (
          <Button label="Got It" onPress={next} />
        ) : n === 12 ? (
          <Button label="Submit Delivery" onPress={() => router.replace('/transporter/dashboard')} />
        ) : (
          <Button label={n === 5 ? 'Save & Continue' : 'Continue'} onPress={next} />
        )}
      </StickyCta>
    </Screen>
  );
}

/* ---------- Steps ---------- */

function Step1() {
  return (
    <View style={{ alignItems: 'center', gap: 20, paddingVertical: 12 }}>
      <Image
        source={require('../../../assets/Logo_Ui.png')}
        style={{ width: 220, height: 96, alignSelf: 'center' }}
        resizeMode="contain"
      />
      <Image
        source={require('../../../assets/truck.png')}
        style={{ width: 360, height: 220 }}
        resizeMode="contain"
      />
      <Text style={{ fontSize: 14, color: '#475569', textAlign: 'center', maxWidth: 460, lineHeight: 20 }}>
        Begin transporter registration. We&apos;ll verify your vehicle and documents in 24 hours.
      </Text>
    </View>
  );
}

function Step2() {
  const o = useTransporterOnboarding();
  const [p, setP] = React.useState(o.phone.replace('+91', ''));
  return (
    <View style={{ gap: 12 }}>
      <Input
        label="Mobile Number"
        prefix="+91"
        keyboardType="number-pad"
        maxLength={10}
        value={p}
        onChangeText={(t) => {
          const d = t.replace(/\D/g, '');
          setP(d);
          o.set({ phone: `+91${d}` });
        }}
        leadingIcon={<Phone size={18} color="#0F172A" />}
        placeholder="98765 43210"
      />
      <Text style={{ fontSize: 12, color: '#64748B' }}>
        By continuing, you agree to our Terms and Privacy Policy.
      </Text>
    </View>
  );
}

function Step3() {
  const o = useTransporterOnboarding();
  return (
    <View style={{ gap: 12 }}>
      <RadioCard
        title="GST Transporter"
        subtitle="I have a GST Number"
        selected={o.type === 'gst'}
        onPress={() => o.set({ type: 'gst' })}
      />
      <RadioCard
        title="Individual Vehicle"
        subtitle="Non-GST"
        selected={o.type === 'individual'}
        onPress={() => o.set({ type: 'individual' })}
      />
    </View>
  );
}

function Step4() {
  const o = useTransporterOnboarding();
  return (
    <View style={{ gap: 12 }}>
      <Input
        label="GST Number"
        autoCapitalize="characters"
        value={o.gstNumber ?? ''}
        onChangeText={(t) => o.set({ gstNumber: t.toUpperCase() })}
        placeholder="36ABCDE1234F1Z5"
        maxLength={15}
      />
      <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
        <ShieldCheck size={48} color="#0F172A" />
        <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
          Server-side verification will run when you tap Continue.
        </Text>
      </Card>
    </View>
  );
}

function Step5() {
  const o = useTransporterOnboarding();
  return (
    <View style={{ gap: 12 }}>
      <Input
        label="Vehicle Number"
        autoCapitalize="characters"
        value={o.vehicleNumber ?? ''}
        onChangeText={(t) => o.set({ vehicleNumber: t.toUpperCase() })}
        placeholder="TS 12 AB 1234"
      />
      <Input
        label="Select Vehicle Type"
        value={o.vehicleType ?? ''}
        onChangeText={(t) => o.set({ vehicleType: t })}
        placeholder="6 Wheeler"
      />
      <Input
        label="Loading Capacity (Tons)"
        keyboardType="number-pad"
        value={o.capacityTons?.toString() ?? ''}
        onChangeText={(t) => o.set({ capacityTons: parseFloat(t || '0') })}
        placeholder="8"
      />
      <Input
        label="RC Number"
        autoCapitalize="characters"
        value={o.rcNumber ?? ''}
        onChangeText={(t) => o.set({ rcNumber: t.toUpperCase() })}
        placeholder="RC123456789"
      />
    </View>
  );
}

function Step6() {
  const Row = ({ label }: { label: string }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600' }}>{label}</Text>
      <Pressable
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#1F7A3C',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Text style={{ color: '#1F7A3C', fontWeight: '700', fontSize: 13 }}>Upload</Text>
        <Upload size={14} color="#0F172A" />
      </Pressable>
    </View>
  );
  return (
    <View style={{ gap: 12 }}>
      <Row label="Driving License" />
      <Row label="RC Book" />
      <Row label="Insurance" />
    </View>
  );
}

function Step7() {
  const [code, setCode] = useState('');
  return (
    <View style={{ gap: 16, alignItems: 'center', paddingTop: 24 }}>
      <Text style={{ fontSize: 14, color: '#475569' }}>Set 4-digit passcode</Text>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: i < code.length ? '#1F7A3C' : 'transparent',
              borderWidth: i < code.length ? 0 : 1.5,
              borderColor: '#1F7A3C',
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 320 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <Pressable
            key={d}
            onPress={() => setCode((c) => (c.length < 4 ? c + d : c))}
            style={{
              width: 88,
              height: 56,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '500' }}>{d}</Text>
          </Pressable>
        ))}
        <View style={{ width: 88, height: 56 }} />
        <Pressable
          onPress={() => setCode((c) => (c.length < 4 ? c + '0' : c))}
          style={{
            width: 88,
            height: 56,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '500' }}>0</Text>
        </Pressable>
        <Pressable
          onPress={() => setCode((c) => c.slice(0, -1))}
          style={{
            width: 88,
            height: 56,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B' }}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Step8() {
  return (
    <View style={{ alignItems: 'center', gap: 16, paddingTop: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#1F7A3C' }}>Call Masking Active</Text>
      <Image
        source={require('../../../assets/final_phone.png')}
        style={{ width: 260, height: 320 }}
        resizeMode="contain"
      />
      <Text style={{ fontSize: 14, color: '#64748B' }}>Your number is protected.</Text>
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#0F1A14', letterSpacing: 2 }}>
        9XXXX XXXXX
      </Text>
    </View>
  );
}

function Step9() {
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>Available for Jobs</Text>
      <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
        Toggle online from your dashboard to start receiving job requests.
      </Text>
    </View>
  );
}

function Step10() {
  return (
    <Card>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F1A14' }}>New Job Request</Text>
      <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>#CS123456</Text>
      <Row label="Pickup Location" value="Bowenpally, Secunderabad" color="#1F7A3C" />
      <Row label="Drop Location" value="Gachibowli, Hyderabad" color="#E5484D" />
      <Row label="Material" value="Cement" />
      <Row label="Weight" value="10 Tons" />
    </Card>
  );
}

function Step11() {
  return (
    <Card>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F1A14' }}>Enroute to Pickup</Text>
      <Text style={{ fontSize: 13, color: '#64748B' }}>Bowenpally, Secunderabad</Text>
    </Card>
  );
}

function Step12() {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '700' }}>Upload Photo Proof</Text>
      <Card style={{ alignItems: 'center', justifyContent: 'center', height: 200, borderStyle: 'dashed' as never }}>
        <Text style={{ color: '#64748B' }}>Tap to capture delivery photo</Text>
      </Card>
      <Text style={{ fontSize: 14, fontWeight: '700' }}>WhatsApp OTP Verification</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[2, 4, 7, 1, 9, 6].map((d, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{d}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ fontSize: 13, color: '#64748B' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: color ?? '#0F1A14' }}>{value}</Text>
    </View>
  );
}
