import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  title?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  centered?: boolean;
};

export function Header({ title, leading, trailing, onBack, showBack = true, centered = true }: Props) {
  const { tokens } = useTheme();
  const router = useRouter();
  return (
    <View
      style={{
        height: 56,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: tokens.color.surface,
        borderBottomColor: tokens.color.border,
        borderBottomWidth: 1,
      }}
    >
      <View style={{ width: 40, alignItems: 'flex-start' }}>
        {leading ? (
          leading
        ) : showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack ?? (() => router.back())}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <ChevronLeft size={24} color="#0F172A" />
          </Pressable>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          textAlign: centered ? 'center' : 'left',
          fontSize: 18,
          fontWeight: '600',
          color: tokens.color.textPrimary,
        }}
      >
        {title}
      </Text>
      <View style={{ width: 40, alignItems: 'flex-end' }}>{trailing}</View>
    </View>
  );
}
