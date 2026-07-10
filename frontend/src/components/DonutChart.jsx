import React from 'react';

const COLOR_HEX = {
  green: '#22C48D',
  blue: '#3FA7D6',
  purple: '#8B5FBF',
  brass: '#FFC93C',
  teal: '#1FAF9E',
  olive: '#F4436C',
};

export default function DonutChart({ buckets }) {
  const total = buckets.reduce((sum, b) => sum + Number(b.balance), 0);
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const segments = buckets
    .filter((b) => Number(b.balance) > 0)
    .map((b) => {
      const fraction = total > 0 ? Number(b.balance) / total : 0;
      const length = fraction * circumference;
      const offset = circumference - cumulative;
      cumulative += length;
      return { id: b.id, name: b.name, color: COLOR_HEX[b.color] || '#3FA7D6', length, offset };
    });

  if (total === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F0E9DB" strokeWidth={strokeWidth} />
        {segments.map((s) => (
          <circle
            key={s.id}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${s.length} ${circumference - s.length}`}
            strokeDashoffset={s.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>

      <div className="flex-1 w-full">
        <p className="font-body text-xs uppercase font-semibold tracking-widest text-inkSoft mb-2">
          How it's split
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {segments.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="font-body text-xs text-ink truncate">{s.name}</span>
              <span className="font-mono text-xs text-inkSoft ml-auto">
                {total > 0 ? Math.round((s.length / circumference) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
