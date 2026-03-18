import logoImage from "@/assets/logo.png";
import { Brain, Lightbulb, MessagesSquare, TrendingUp, Languages, Palette, Compass } from "lucide-react";
import { QuestionForm as QuestionFormType, Category } from "@/types/chat";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuestionFormProps {
  onSubmit: (form: QuestionFormType, depth: number) => void;
  initialProblem?: string;
  disabled?: boolean;
}

const CATEGORIES_DATA = [
  { 
    id: "problem-solving" as Category, 
    label: "문제 풀이", 
    labelEn: "Problem Solving", 
    sub: "코딩 · 수학 · 과학 · 데이터 분석", 
    subEn: "Coding · Math · Science · Data",
    icon: Brain,
    color: "bg-blue-50 text-blue-600"
  },
  { 
    id: "idea-exploration" as Category, 
    label: "아이디어 탐구", 
    labelEn: "Idea Exploration", 
    sub: "비즈니스 · 기획 · 창업", 
    subEn: "Business · Planning · Startup",
    icon: Lightbulb,
    color: "bg-amber-50 text-amber-600"
  },
  { 
    id: "debate" as Category, 
    label: "토론", 
    labelEn: "Debate", 
    sub: "철학 · 인문 · 에세이", 
    subEn: "Philosophy · Humanities · Essay",
    icon: MessagesSquare,
    color: "bg-green-50 text-green-600"
  },
  { 
    id: "self-development" as Category, 
    label: "자기계발", 
    labelEn: "Self Development", 
    sub: "커리어 · 진로 · 자기 이해 · 감정", 
    subEn: "Career · Growth · Self-awareness",
    icon: TrendingUp,
    color: "bg-purple-50 text-purple-600"
  },
  { 
    id: "language" as Category, 
    label: "언어 · 외국어", 
    labelEn: "Language", 
    sub: "문법 · 번역 · 회화 · 작문", 
    subEn: "Grammar · Translation · Writing",
    icon: Languages,
    color: "bg-orange-50 text-orange-600"
  },
  { 
    id: "creation" as Category, 
    label: "창작", 
    labelEn: "Creation", 
    sub: "글 · 그림 · 음악", 
    subEn: "Writing · Art · Music",
    icon: Palette,
    color: "bg-pink-50 text-pink-600"
  },
  { 
    id: "free-exploration" as Category, 
    label: "자유 탐구", 
    labelEn: "Free Exploration", 
    sub: "카테고리 없이 자유롭게 시작하기", 
    subEn: "Start without a category",
    icon: Compass,
    color: "bg-indigo-50 text-indigo-600",
  },
];

export function QuestionForm({
  onSubmit,
  initialProblem,
  disabled = false
}: QuestionFormProps) {
  const { language, t } = useLanguage();

  const handleCategoryClick = (id: Category) => {
    if (disabled) {
      import("sonner").then(({ toast }) => {
        toast.info(t('usageLimitReached'));
      });
      return;
    }
    onSubmit({
      category: id,
      problem: initialProblem || "",
    }, 10); // Standard depth is 10
  };

  return (
    <div className="space-y-10 w-full max-w-4xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {CATEGORIES_DATA.map((card, index) => {
          const Icon = card.icon;

          return (
            <button
              key={card.id}
              onClick={() => handleCategoryClick(card.id)}
              disabled={false} // We handle disabled state in handleCategoryClick for the toast
              className={cn(
                "group relative flex flex-col p-4 sm:p-5 bg-white border border-border rounded-2xl text-left transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 zoom-in-95 duration-700 fill-mode-both shadow-sm",
                disabled ? "opacity-60 cursor-default" : "hover:border-primary/50 hover:shadow-lg active:scale-[0.98]"
              )}
              style={{ animationDelay: `${(index + 1) * 150}ms` }}
            >
              {/* Top Row: Icon + Title */}
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-colors group-hover:scale-110 duration-300",
                  card.color
                )}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                  {language === 'ko' ? card.label : card.labelEn}
                </h3>
              </div>

              {/* Bottom: Subtext */}
              <p className="text-[14px] sm:text-[15px] text-foreground/80 font-medium line-clamp-2 leading-snug">
                {language === 'ko' ? card.sub : card.subEn}
              </p>

              {/* Hover effect indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
