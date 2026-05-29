/**
 * DonutChart — small SVG donut with center label + side legend.
 * Hand-rolled with react-native-svg.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { FontFamily } from '@/constants/theme';

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
};

export function DonutChart({
  data,
  size = 160,
  thickness = 18,
  centerLabel = 'Total',
  centerValue,
}: Props) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pre-calc each slice's stroke-dasharray + dashoffset
  let cumulative = 0;
  const slices = data.map((slice) => {
    const fraction = slice.value / total;
    const length = fraction * circumference;
    const offset = -cumulative;
    cumulative += length;
    return {
      ...slice,
      length,
      offset,
      pct: fraction * 100,
    };
  });

  const computedCenterValue = centerValue ?? total;

  return (
    <View style={s.row}>
      <View style={[s.donutWrap, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F1F5F9"
            strokeWidth={thickness}
            fill="none"
          />
          {/* Slices — rotate -90° so start is at 12 o'clock */}
          <G rotation="-90" originX={size / 2} originY={size / 2}>
            {slices.map((sl, i) => (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={sl.color}
                strokeWidth={thickness}
                fill="none"
                strokeDasharray={`${sl.length} ${circumference}`}
                strokeDashoffset={sl.offset}
                strokeLinecap="butt"
              />
            ))}
          </G>
        </Svg>

        {/* Center label */}
        <View style={s.centerLabel} pointerEvents="none">
          <Text style={s.centerNum}>{computedCenterValue}</Text>
          <Text style={s.centerTxt}>{centerLabel}</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={s.legend}>
        {slices.map((sl, i) => (
          <View key={i} style={s.legendRow}>
            <View style={[s.legendDot, { backgroundColor: sl.color }]} />
            <Text style={s.legendLabel} numberOfLines={1}>{sl.label}</Text>
            <Text style={s.legendValue}>{sl.value}</Text>
            <Text style={s.legendPct}>{sl.pct.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  donutWrap: { alignItems: 'center', justifyContent: 'center' },
  centerLabel: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  centerNum: {
    fontFamily: FontFamily.bold,
    fontSize: 22, color: '#0F172A', letterSpacing: -0.5,
  },
  centerTxt: {
    fontFamily: FontFamily.regular,
    fontSize: 10, color: '#94A3B8',
    letterSpacing: 0.4, marginTop: 1,
  },

  legend: { flex: 1, gap: 9, minWidth: 160 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: {
    flex: 1,
    fontFamily: FontFamily.medium, fontSize: 12.5, color: '#334155',
  },
  legendValue: {
    fontFamily: FontFamily.semiBold, fontSize: 12.5, color: '#0F172A',
  },
  legendPct: {
    fontFamily: FontFamily.regular, fontSize: 11.5, color: '#94A3B8',
    minWidth: 44, textAlign: 'right',
  },
});
