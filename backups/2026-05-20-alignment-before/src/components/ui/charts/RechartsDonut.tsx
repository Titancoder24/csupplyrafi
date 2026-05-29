/**
 * RechartsDonut — pie/donut for the Super Admin dashboard (web-only).
 * Black/white monochrome by default; per-segment override via data.color.
 */
import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

export type DonutDatum = { label: string; value: number; color?: string };

type Props = {
  data: DonutDatum[];
  size?: number;
  centerLabel?: string;
  centerValue?: string | number;
};

// Monochrome palette — varying shades of slate/black, no colour
const MONO_FILLS = ['#0F172A', '#334155', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0'];

export function RechartsDonut({ data, size = 200, centerLabel, centerValue }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ position: 'relative', width: '100%', height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={size * 0.32}
            outerRadius={size * 0.46}
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={d.label} fill={d.color ?? MONO_FILLS[i % MONO_FILLS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              padding: '8px 12px',
              boxShadow: '0 6px 16px rgba(15,23,42,0.06)',
            }}
            labelStyle={{ color: '#0F172A', fontWeight: 600 }}
            itemStyle={{ color: '#475569' }}
            formatter={(value, name) => {
              const numericValue = Number(value ?? 0);
              const pct = total > 0 ? Math.round((numericValue / total) * 100) : 0;
              return [`${numericValue.toLocaleString()} (${pct}%)`, String(name)];
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {(centerLabel || centerValue !== undefined) && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {centerValue !== undefined && (
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: '#0F172A',
              letterSpacing: -0.4,
              lineHeight: 1,
            }}>
              {centerValue}
            </div>
          )}
          {centerLabel && (
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: 11,
              color: '#94A3B8',
              marginTop: 4,
              letterSpacing: 0.2,
              textTransform: 'uppercase',
            }}>
              {centerLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
