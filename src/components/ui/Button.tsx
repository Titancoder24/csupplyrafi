import React from 'react';
import { ActivityIndicator, Pressable, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth = true,
  leadingIcon,
  trailingIcon,
  style,
  ...rest
}: Props) {
  const { tokens } = useTheme();
  const heights = { sm: 40, md: 48, lg: 52 } as const;
  const paddings = { sm: 16, md: 20, lg: 24 } as const;
  const fontSizes = { sm: 14, md: 15, lg: 16 } as const;

  const palette = {
    primary: {
      bg: tokens.color.accent,
      pressed: tokens.color.accentDark,
      label: '#FFFFFF',
      border: 'transparent',
    },
    secondary: {
      bg: 'transparent',
      pressed: tokens.color.muted,
      label: tokens.color.primary,
      border: tokens.color.primary,
    },
    ghost: {
      bg: 'transparent',
      pressed: tokens.color.muted,
      label: tokens.color.primary,
      border: 'transparent',
    },
    danger: {
      bg: 'transparent',
      pressed: tokens.color.dangerBg,
      label: tokens.color.danger,
      border: tokens.color.danger,
    },
  } as const;

  const p = palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: heights[size],
          paddingHorizontal: paddings[size],
          borderRadius: 12,
          backgroundColor: pressed ? p.pressed : p.bg,
          borderWidth: variant === 'secondary' || variant === 'danger' ? 1.5 : 0,
          borderColor: p.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          gap: 8,
        },
        style as ViewStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.label} />
      ) : (
        <>
          {leadingIcon ? <View>{leadingIcon}</View> : null}
          <Text
            style={{
              color: p.label,
              fontSize: fontSizes[size],
              fontWeight: '600',
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Text>
          {trailingIcon ? <View>{trailingIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
