/**
 * RechartsLine — line/area chart for the Super Admin dashboard (web-only).
 * Recharts under the hood. Black/white minimal palette by default.
 */
import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export type LinePoint = { label: string; value: number };

type Props = {
  data: LinePoint[];
  height?: number;
  color?: string;
};

export function RechartsLine({ data, height = 220, color = '#0F172A' }: Props) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="rl_fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EEF2F6" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: '#94A3B8', fontSize: 10.5, fontFamily: 'Inter, sans-serif' }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              padding: '8px 12px',
              boxShadow: '0 6px 16px rgba(15,23,42,0.06)',
            }}
            labelStyle={{ color: '#0F172A', fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ color: '#475569' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#rl_fill)"
            dot={{ r: 3, stroke: color, strokeWidth: 2, fill: '#FFFFFF' }}
            activeDot={{ r: 4, stroke: color, strokeWidth: 2, fill: '#FFFFFF' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
