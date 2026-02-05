import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepthSelector } from "./DepthSelector";
import { QuestionForm as QuestionFormType } from "@/types/chat";
interface QuestionFormProps {
  onSubmit: (form: QuestionFormType, depth: number) => void;
  depth: number;
  onDepthChange: (depth: number) => void;
}
export function QuestionForm({
  onSubmit,
  depth,
  onDepthChange
}: QuestionFormProps) {
  const [form, setForm] = useState<QuestionFormType>({
    problem: "",
    attempts: "",
    goal: ""
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.problem.trim() || !form.attempts.trim() || !form.goal.trim()) return;
    onSubmit(form, depth);
  };
  const isValid = form.problem.trim() && form.attempts.trim() && form.goal.trim();
  return <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-serif">1. 문제 파악 : 해결하고 싶은 고민, 문제를 입력해 주세요.</label>
          <textarea className="input-field min-h-[80px]" value={form.problem} onChange={e => setForm(prev => ({
          ...prev,
          problem: e.target.value
        }))} placeholder="" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-serif">2. 시도 내용 : 해결을 위해 어떤 방식, 방법을 시도하였나요?</label>
          <textarea className="input-field min-h-[60px]" value={form.attempts} onChange={e => setForm(prev => ({
          ...prev,
          attempts: e.target.value
        }))} placeholder="" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 font-serif">3. 성장 목표 : 당신이 해결하고 싶은 궁극적인 목표를 알려주세요.</label>
          <textarea className="input-field min-h-[60px]" value={form.goal} onChange={e => setForm(prev => ({
          ...prev,
          goal: e.target.value
        }))} placeholder="" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <DepthSelector value={depth} onChange={onDepthChange} />
        
        <Button type="submit" disabled={!isValid} className="rounded-xl px-5 h-10">
          <Send className="w-4 h-4 mr-2" />
          시작하기
        </Button>
      </div>
    </form>;
}