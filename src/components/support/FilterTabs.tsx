/**
 * FilterTabs — segmented filter row used above the ticket list.
 * Linear / Intercom style: single-row, hairline-underline active state.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SupportTheme as T } from './theme';

export type FilterTab = {
  key: string;
  label: string;
  count?: number;
};

export function FilterTabs({
  tabs, value, onChange,
}: {
  tabs: FilterTab[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
    >
      {tabs.map(t => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[s.tab, active && s.tabActive]}
          >
            <Text style={[s.label, active && s.labelActive]}>{t.label}</Text>
            {typeof t.count === 'number' && (
              <View style={[s.badge, active && s.badgeActive]}>
                <Text style={[s.badgeTxt, active && s.badgeTxtActive]}>{t.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: T.card,
    borderColor: T.border,
  },
  label: {
    fontFamily: T.font.medium,
    fontSize: 13,
    color: T.textMuted,
    letterSpacing: -0.1,
  },
  labelActive: {
    fontFamily: T.font.semiBold,
    color: T.ink,
  },
  badge: {
    minWidth: 18, height: 18,
    paddingHorizontal: 5,
    borderRadius: 6,
    backgroundColor: T.neutralBg,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: T.ink,
  },
  badgeTxt: {
    fontFamily: T.font.semiBold,
    fontSize: 10.5,
    color: T.textMuted,
  },
  badgeTxtActive: {
    color: '#FFFFFF',
  },
});
