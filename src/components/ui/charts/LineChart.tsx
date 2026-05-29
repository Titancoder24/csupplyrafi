/**
 * LineChart — minimal SVG line chart for dashboard KPIs.
 * Hand-rolled (react-native-svg) so no extra bundle weight.
 * Props: data (array of { label, value }), height, color.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient as SvgLG, Stop } from 'react-native-svg';
import { FontFamily } from '@/constants/theme';

export type LinePoint = { label: string; value: number };

type Props = {
  data: LinePoint[];
  height?: number;
  color?: string;
  fillColor?: string;
};

export function LineChart({
  data,
  height = 200,
  color = '#2563EB',
  fillColor = 'rgba(37,99,235,0.08)',
}: Props) {
  // Layout
  const padTop    = 14;
  const padBottom = 28;
  const padLeft   = 32;
  const padRight  = 12;

  // Compute max for scaling. Floor min to 0 so the chart anchors to baseline.
  const values = data.map(d => d.value);
  const maxRaw = Math.max(...values, 1);
  // Round max up to next "nice" number (2/4/6/8/10 buckets)
  const niceMax = niceCeil(maxRaw);

  // SVG viewBox sizing — we'll let Svg auto-scale to parent width via percent
  // But for path math we use a fixed virtual width.
  const W = 600;
  const H = height;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  // X positions for each data point
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: padLeft + i * stepX,
    y: padTop + plotH - (d.value / niceMax) * plotH,
    label: d.label,
    value: d.value,
  }));

  // Smooth path (catmull-rom-ish via cubic bezier)
  const pathD = buildSmoothPath(points);
  const fillD = `${pathD} L ${padLeft + (points.length - 1) * stepX} ${padTop + plotH} L ${padLeft} ${padTop + plotH} Z`;

  // Y-axis ticks (4 grid lines)
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = (niceMax * (ticks - i)) / ticks;
    const y = padTop + plotH - (v / niceMax) * plotH;
    return { value: v, y };
  });

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <SvgLG id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.18" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgLG>
        </Defs>

        {/* Grid lines + Y labels */}
        {yTicks.map((t, i) => (
          <React.Fragment key={`g${i}`}>
            <Line
              x1={padLeft} y1={t.y} x2={W - padRight} y2={t.y}
              stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3 3"
            />
          </React.Fragment>
        ))}

        {/* Fill */}
        <Path d={fillD} fill="url(#lineFill)" />
        {/* Stroke */}
        <Path d={pathD} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <Circle key={`p${i}`} cx={p.x} cy={p.y} r={3.4} fill="#fff" stroke={color} strokeWidth={2} />
        ))}
      </Svg>

      {/* X-axis labels — outside Svg so they pick up Inter font */}
      <View style={[s.xLabels, { paddingLeft: (padLeft / W) * 100 + '%' as any, paddingRight: (padRight / W) * 100 + '%' as any }]}>
        {points.map((p, i) => (
          <Text key={`x${i}`} style={s.xLabel} numberOfLines={1}>
            {p.label}
          </Text>
        ))}
      </View>

      {/* Y-axis labels — overlay */}
      <View style={[s.yLabels, { height }]}>
        {yTicks.map((t, i) => (
          <View
            key={`y${i}`}
            style={{
              position: 'absolute',
              top: t.y - 7,
              left: 0,
              width: padLeft - 4,
            }}
          >
            <Text style={s.yLabel}>{Math.round(t.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function niceCeil(v: number): number {
  if (v <= 1) return 1;
  if (v <= 2) return 2;
  if (v <= 5) return 5;
  if (v <= 10) return 10;
  if (v <= 20) return 20;
  if (v <= 50) return 50;
  if (v <= 100) return 100;
  // Round up to nearest 100
  return Math.ceil(v / 100) * 100;
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur  = pts[i];
    const cx1  = prev.x + (cur.x - prev.x) / 2;
    const cy1  = prev.y;
    const cx2  = prev.x + (cur.x - prev.x) / 2;
    const cy2  = cur.y;
    d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${cur.x} ${cur.y}`;
  }
  return d;
}

const s = StyleSheet.create({
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -22,
    marginLeft: 4,
    marginRight: 4,
  },
  xLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    color: '#94A3B8',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  yLabels: {
    position: 'absolute',
    left: 0, top: 0,
    width: 36,
  },
  yLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'right',
    paddingRight: 4,
  },
});
