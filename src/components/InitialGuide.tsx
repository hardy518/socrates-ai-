import { Sparkles } from "lucide-react";
export function InitialGuide() {
  return <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
      <div className="max-w-lg text-center space-y-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-4">
          <h1 className="font-semibold text-foreground leading-tight text-xl">
            성장은 정답이 아닌,<br />
            고민의 과정에서 일어납니다.
          </h1>
        </div>

        <div className="space-y-5 text-left">
          <div className="flex gap-4 items-start">
            <span className="flex-shrink-0 text-primary font-semibold text-sm">1.</span>
            <p className="text-sm text-foreground">Socrates AI는 당신의 성장을 위해 정답을 주지 않는 불편한 AI 입니다.</p>
          </div>
          
          <div className="flex gap-4 items-start">
            <span className="flex-shrink-0 text-primary font-semibold text-sm">2.</span>
            <p className="text-sm text-foreground">구체적인 문제를 입력하면, Socrates AI와 토론을 시작합니다.</p>
            </div>

          <div className="flex gap-4 items-start">
            <span className="flex-shrink-0 text-primary font-semibold text-sm">3.</span>
            <p className="text-sm text-foreground">속도와 정답에 가려진 본질을 탐구해 보세요.</p>
          </div>
        </div>
      </div>
    </div>;
}