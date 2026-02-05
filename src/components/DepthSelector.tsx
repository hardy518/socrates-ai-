import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
interface DepthSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}
export function DepthSelector({
  value,
  onChange,
  disabled
}: DepthSelectorProps) {
  return <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">고민 단계</span>
      <Select value={value.toString()} onValueChange={v => onChange(parseInt(v))} disabled={disabled}>
        <SelectTrigger className="w-20 h-9 bg-secondary border-0 rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border border-border rounded-xl shadow-lg z-50">
          {Array.from({
          length: 8
        }, (_, i) => i + 3).map(depth => <SelectItem key={depth} value={depth.toString()} className="rounded-lg">
              {depth}단계
            </SelectItem>)}
        </SelectContent>
      </Select>
    </div>;
}