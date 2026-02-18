interface GrowthGaugeProps {
  current: number;
  total: number;
}

export function GrowthGauge({ current, total }: GrowthGaugeProps) {
  const percentage = Math.min((current / total) * 100, 100);
  const isComplete = current >= total;

  return (
    <div className="flex items-center gap-3">
      <div className="growth-gauge h-2 w-32 flex-shrink-0">
        <div
          className="growth-gauge-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-sm font-medium tabular-nums ${isComplete ? 'text-[hsl(var(--growth-gauge))]' : 'text-muted-foreground'}`}>
        {current}/{total}
      </span>
    </div>
  );
}
