import React from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

type Props = ScrollViewProps & {
  scroll?: boolean;
  background?: string;
  padding?: number;
  bottomBarHeight?: number;
};

export function Screen({
  scroll = true,
  background,
  padding = 16,
  bottomBarHeight = 0,
  children,
  contentContainerStyle,
  style,
  ...rest
}: Props) {
  const { tokens } = useTheme();
  const bg = background ?? tokens.color.background;
  if (!scroll) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: bg }}>
        <View style={[{ flex: 1, padding, paddingBottom: padding + bottomBarHeight }, style]}>
          {children}
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          { padding, paddingBottom: padding + 24 + bottomBarHeight },
          contentContainerStyle,
        ]}
        style={[{ flex: 1 }, style]}
        {...rest}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
