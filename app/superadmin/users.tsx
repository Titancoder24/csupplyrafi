import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Search, Trash2, UserX, UserCheck, User as UserIcon, Phone, Calendar } from 'lucide-react-native';
import { Colors, FontFamily, Radius, Shadow, Semantic, Ink } from '@/constants/theme';
import { supabase } from '@/services/supabase';

type User = {
  id: string; full_name: string; phone: string;
  role: string; blocked: boolean; verified: boolean; created_at: string;
};

const ROLES = ['all', 'customer', 'vendor', 'transporter', 'admin', 'super_admin'];

function rolePill(role: string): { fg: string; bg: string } {
  if (role === 'vendor')       return { fg: Semantic.warningFg, bg: Semantic.warningBg };
  if (role === 'transporter')  return { fg: '#C2410C',           bg: '#FFF7ED' };
  if (role === 'super_admin')  return { fg: Semantic.purpleFg,   bg: Semantic.purpleBg };
  if (role === 'admin')        return { fg: Semantic.infoFg,     bg: Semantic.infoBg };
  if (role === 'customer')     return { fg: Semantic.successFg,  bg: Semantic.successBg };
  return { fg: Ink[500], bg: Ink[100] };
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UsersScreen() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 700;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  async function fetchUsers() {
    setLoading(true);
    try {
      let q = supabase
        .from('profiles')
        .select('id, full_name, phone, role, blocked, verified, created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (roleFilter !== 'all') q = q.eq('role', roleFilter);
      const { data, error } = await q;
      if (error) throw error;
      setUsers(data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function setBlocked(id: string, blocked: boolean) {
    setActing(id);
    await supabase.from('profiles').update({ blocked }).eq('id', id);
    setUsers(u => u.map(x => x.id === id ? { ...x, blocked } : x));
    setActing(null);
  }

  async function deleteUser(id: string) {
    setActing(id);
    await supabase.from('profiles').delete().eq('id', id);
    setUsers(u => u.filter(x => x.id !== id));
    setActing(null);
  }

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      {/* Search + count */}
      <View style={s.searchBox}>
        <Search size={16} color="#0F172A" />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={s.count}>{filtered.length} {filtered.length === 1 ? 'user' : 'users'}</Text>
      </View>

      {/* Role filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.filterRow}>
          {ROLES.map(r => (
            <Pressable
              key={r}
              style={[s.filterChip, roleFilter === r && s.filterChipActive]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[s.filterChipText, roleFilter === r && s.filterChipTextActive]}>
                {r === 'all' ? 'All Roles' : r.replace('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconBox}>
            <UserIcon size={28} color="#0F172A" strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>No users found</Text>
          <Text style={s.emptyText}>Try adjusting your search or role filter.</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map(u => {
            const rp = rolePill(u.role);
            return (
              <View key={u.id} style={s.card}>
                <View style={s.avatar}>
                  <Text style={s.avatarLetter}>{(u.full_name || '?')[0]?.toUpperCase()}</Text>
                </View>

                <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                  <View style={s.rowTop}>
                    <Text style={s.name} numberOfLines={1}>{u.full_name || '—'}</Text>
                    <View style={[s.pill, { backgroundColor: rp.bg }]}>
                      <Text style={[s.pillTxt, { color: rp.fg }]}>{u.role?.replace('_', ' ')}</Text>
                    </View>
                  </View>

                  <View style={s.metaRow}>
                    {u.phone ? (
                      <View style={s.metaItem}>
                        <Phone size={11} color="#0F172A" strokeWidth={2} />
                        <Text style={s.metaTxt}>{u.phone}</Text>
                      </View>
                    ) : null}
                    <View style={s.metaItem}>
                      <Calendar size={11} color="#0F172A" strokeWidth={2} />
                      <Text style={s.metaTxt}>{fmtDate(u.created_at)}</Text>
                    </View>
                    <View style={[s.statusPill, {
                      backgroundColor: u.blocked ? Semantic.dangerBg : Semantic.successBg,
                    }]}>
                      <Text style={[s.statusPillTxt, {
                        color: u.blocked ? Semantic.dangerFg : Semantic.successFg,
                      }]}>
                        {u.blocked ? 'Suspended' : 'Active'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[s.actions, isNarrow && { flexDirection: 'column-reverse' }]}>
                  {u.blocked ? (
                    <Pressable
                      style={[s.iconBtn, { backgroundColor: Semantic.successBg }]}
                      onPress={() => setBlocked(u.id, false)}
                      disabled={acting === u.id}
                    >
                      <UserCheck size={15} color="#0F172A" strokeWidth={2} />
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[s.iconBtn, { backgroundColor: Semantic.warningBg }]}
                      onPress={() => setBlocked(u.id, true)}
                      disabled={acting === u.id}
                    >
                      <UserX size={15} color="#0F172A" strokeWidth={2} />
                    </Pressable>
                  )}
                  <Pressable
                    style={[s.iconBtn, { backgroundColor: Semantic.dangerBg }]}
                    onPress={() => deleteUser(u.id)}
                    disabled={acting === u.id}
                  >
                    <Trash2 size={15} color="#0F172A" strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Ink[100] },
  scroll: { padding: 24, gap: 16, paddingBottom: 40 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  searchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textPrimary, ...(({ outlineStyle: 'none' }) as any) },
  count:       { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textMuted },

  filterRow: { flexDirection: 'row', gap: 6 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' },
  filterChipTextActive: { color: Colors.white },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: 14,
    ...Shadow.card,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Ink[100], alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarLetter: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.primary },

  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:   { fontFamily: FontFamily.semiBold, fontSize: 14, color: Ink[900], flex: 1 },

  pill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  pillTxt: { fontFamily: FontFamily.semiBold, fontSize: 10, textTransform: 'capitalize' },

  metaRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:  { fontFamily: FontFamily.regular, fontSize: 11, color: Ink[500] },

  statusPill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusPillTxt: { fontFamily: FontFamily.semiBold, fontSize: 10 },

  actions:  { flexDirection: 'row', gap: 6 },
  iconBtn:  {
    width: 34, height: 34, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  loader: { padding: 60, alignItems: 'center' },
  empty: {
    padding: 40, alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyIconBox: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Ink[50], borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 14, color: Ink[900] },
  emptyText:  { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted },
});
