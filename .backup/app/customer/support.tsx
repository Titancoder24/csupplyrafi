import React from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Linking, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Mail, Phone, ChevronRight, HelpCircle, FileText, Shield } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const GREEN   = '#15803D';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

const FAQS = [
  { q: 'How do I track my order?',            a: 'Go to My Orders → tap your order → live tracking is shown.' },
  { q: 'What payment methods are accepted?',  a: 'Cash on Delivery is currently available. UPI & card payments coming soon.' },
  { q: 'Can I cancel or modify an order?',    a: 'Orders can be cancelled before vendor acceptance. Contact support immediately for modifications.' },
  { q: 'How are delivery charges calculated?', a: 'Charges are based on total weight and distance. You\'ll see the exact amount at checkout.' },
];

export default function Support() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color={TEXT} strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Help & Support</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.heroBanner}>
          <HelpCircle size={32} color={PRIMARY} strokeWidth={1.6} />
          <Text style={s.heroTitle}>We're here to help</Text>
          <Text style={s.heroSub}>Reach us on WhatsApp, email, or phone. We reply within one business day.</Text>
        </View>

        {/* Contact options */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Contact Us</Text>
          {[
            {
              icon: MessageCircle, color: GREEN, bg: '#F0FDF4',
              label: 'WhatsApp Support', sub: 'Chat with us directly',
              onPress: () => Linking.openURL('https://wa.me/919876543210'),
            },
            {
              icon: Phone, color: PRIMARY, bg: '#EFF6FF',
              label: 'Call Support', sub: '+91 98765 43210',
              onPress: () => Linking.openURL('tel:+919876543210'),
            },
            {
              icon: Mail, color: '#7C3AED', bg: '#F5F3FF',
              label: 'Email Support', sub: 'support@csupply.in',
              onPress: () => Linking.openURL('mailto:support@csupply.in'),
            },
          ].map(item => (
            <Pressable key={item.label} style={s.contactRow} onPress={item.onPress}>
              <View style={[s.contactIconBox, { backgroundColor: item.bg }]}>
                <item.icon size={18} color={item.color} strokeWidth={1.8} />
              </View>
              <View style={s.contactBody}>
                <Text style={s.contactLabel}>{item.label}</Text>
                <Text style={s.contactSub}>{item.sub}</Text>
              </View>
              <ChevronRight size={16} color={MUTED} strokeWidth={2} />
            </Pressable>
          ))}
        </View>

        {/* FAQ */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Frequently Asked Questions</Text>
          {FAQS.map((faq, i) => (
            <Pressable
              key={i}
              style={[s.faqItem, i > 0 && s.faqBorder]}
              onPress={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <View style={s.faqHeader}>
                <Text style={s.faqQ}>{faq.q}</Text>
                <ChevronRight
                  size={16} color={MUTED} strokeWidth={2}
                  style={{ transform: [{ rotate: openFaq === i ? '90deg' : '0deg' }] }}
                />
              </View>
              {openFaq === i && (
                <Text style={s.faqA}>{faq.a}</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Quick links */}
        <View style={s.linksRow}>
          {[
            { icon: FileText, label: 'Terms',   color: MUTED },
            { icon: Shield,   label: 'Privacy', color: MUTED },
          ].map(link => (
            <Pressable key={link.label} style={s.linkBtn}>
              <link.icon size={14} color={link.color} strokeWidth={2} />
              <Text style={s.linkTxt}>{link.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingBottom: 12,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },

  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  heroBanner: {
    alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  heroTitle: { fontFamily: FontFamily.bold, fontSize: 18, color: TEXT },
  heroSub:   { fontFamily: FontFamily.regular, fontSize: 13.5, color: TEXTSUB, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTitle: {
    fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXTSUB,
    paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: BORDER,
    backgroundColor: BG,
  },

  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  contactIconBox: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  contactBody:    { flex: 1, gap: 2 },
  contactLabel:   { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXT },
  contactSub:     { fontFamily: FontFamily.regular, fontSize: 12.5, color: MUTED },

  faqItem:   { paddingHorizontal: 14, paddingVertical: 13 },
  faqBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ:      { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, flex: 1, lineHeight: 19 },
  faqA:      { fontFamily: FontFamily.regular, fontSize: 13, color: TEXTSUB, lineHeight: 20, marginTop: 8 },

  linksRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  linkBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  linkTxt:  { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED },
});
