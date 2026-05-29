import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = ViewProps & {
  padding?: number;
  selected?: boolean;
  noBorder?: boolean;
  raised?: boolean;
  radius?: number;
};

export function Card({ padding = 16, selected, noBorder, raised, radius, style, children, ...rest }: Props) {
  const { tokens, elevation } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tokens.color.surface,
          borderRadius: radius ?? tokens.radius.md,
          padding,
          borderWidth: noBorder ? 0 : selected ? 1.5 : 1,
          borderColor: selected ? tokens.color.primary : tokens.color.border,
        },
        raised ? elevation.sm : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
