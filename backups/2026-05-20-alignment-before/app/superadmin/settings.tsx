import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily } from '@/constants/theme';

export default function SettingsScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sub}>Platform settings coming soon.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: 22, color: Colors.textPrimary },
  sub: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textMuted, marginTop: 8 },
});
