import React, { useState } from 'react';
import { TextInput, type TextInputProps, View, Text, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  onPressTrailing?: () => void;
  prefix?: string;
};

export function Input({
  label,
  helperText,
  errorText,
  leadingIcon,
  trailingIcon,
  onPressTrailing,
  prefix,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(errorText);

  return (
    <View style={{ width: '100%' }}>
      {label ? (
        <Text
          style={{
            color: tokens.color.textSecondary,
            fontSize: 13,
            fontWeight: '500',
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.sm,
          borderWidth: hasError ? 1.5 : focused ? 1.5 : 1,
          borderColor: hasError
            ? tokens.color.danger
            : focused
            ? tokens.color.primary
            : tokens.color.border,
          paddingHorizontal: 12,
          minHeight: 48,
        }}
      >
        {leadingIcon ? <View style={{ marginRight: 8 }}>{leadingIcon}</View> : null}
        {prefix ? (
          <Text style={{ color: tokens.color.textPrimary, fontSize: 15, fontWeight: '500', marginRight: 8 }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={tokens.color.textMuted}
          style={[
            {
              flex: 1,
              color: tokens.color.textPrimary,
              fontSize: 15,
              paddingVertical: 12,
            },
            style,
          ]}
        />
        {trailingIcon ? (
          <Pressable
            onPress={onPressTrailing}
            disabled={!onPressTrailing}
            style={{ marginLeft: 8 }}
            accessibilityRole={onPressTrailing ? 'button' : undefined}
          >
            {trailingIcon}
          </Pressable>
        ) : null}
      </View>
      {helperText && !hasError ? (
        <Text style={{ color: tokens.color.textMuted, fontSize: 12, marginTop: 4 }}>
          {helperText}
        </Text>
      ) : null}
      {hasError ? (
        <Text style={{ color: tokens.color.danger, fontSize: 12, marginTop: 4 }}>{errorText}</Text>
      ) : null}
    </View>
  );
}
