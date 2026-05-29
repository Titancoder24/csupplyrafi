import React from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, Download, CheckCircle2, Clock } from 'lucide-react-native';
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

const DEMO_INVOICES = [
  { id: 'inv-001', orderNo: 'CS-2024-001',  date: '2024-11-15', amount: 48500, status: 'available' },
  { id: 'inv-002', orderNo: 'CS-2024-002',  date: '2024-11-08', amount: 31200, status: 'available' },
  { id: 'inv-003', orderNo: 'CS-2024-003',  date: '2024-10-22', amount: 92800, status: 'available' },
  { id: 'inv-004', orderNo: 'CS-2024-004',  date: '2024-10-05', amount: 15400, status: 'processing' },
];

export default function Invoices() {
  const router = useRouter();

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Invoices & GST</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Info banner */}
        <View style={s.infoBanner}>
          <FileText size={18} color="#0F172A" strokeWidth={1.8} />
          <Text style={s.infoTxt}>
            GST invoices are generated automatically for delivered orders. Tap any invoice to view or download the PDF.
          </Text>
        </View>

        {/* Invoice list */}
        {DEMO_INVOICES.map(inv => (
          <Pressable key={inv.id} style={s.card}>
            <View style={[s.iconBox, { backgroundColor: inv.status === 'available' ? '#F0FDF4' : '#FFFBEB' }]}>
              {inv.status === 'available'
                ? <CheckCircle2 size={20} color="#0F172A" strokeWidth={2} />
                : <Clock size={20} color="#0F172A" strokeWidth={2} />
              }
            </View>
            <View style={s.cardBody}>
              <Text style={s.orderNo}>Order #{inv.orderNo}</Text>
              <Text style={s.date}>{new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
            <View style={s.cardRight}>
              <Text style={s.amount}>₹{inv.amount.toLocaleString('en-IN')}</Text>
              {inv.status === 'available'
                ? <Pressable style={s.downloadBtn}>
                    <Download size={13} color="#0F172A" strokeWidth={2.5} />
                    <Text style={s.downloadTxt}>PDF</Text>
                  </Pressable>
                : <View style={s.processingPill}>
                    <Text style={s.processingTxt}>Processing</Text>
                  </View>
              }
            </View>
          </Pressable>
        ))}
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

  scroll: { padding: 16, gap: 10, paddingBottom: 40 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoTxt: { flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: '#1E40AF', lineHeight: 19 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  iconBox:  { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3 },
  orderNo:  { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXT },
  date:     { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },
  cardRight:{ alignItems: 'flex-end', gap: 6 },
  amount:   { fontFamily: FontFamily.bold, fontSize: 14, color: TEXT },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  downloadTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: PRIMARY },
  processingPill: {
    backgroundColor: '#FFFBEB', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  processingTxt: { fontFamily: FontFamily.regular, fontSize: 11, color: '#D97706' },
});
