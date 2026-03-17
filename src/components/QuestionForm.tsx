import { useState, useRef, useEffect } from "react";
import logoImage from "@/assets/logo.png";
import { Plus, X, FileIcon, ImageIcon, Camera, Image as ImageIconLucide, Scissors, GraduationCap, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionForm as QuestionFormType, Category, MessageFile } from "@/types/chat";
import { cn } from "@/lib/utils";
import { ImageCropper } from "./ImageCropper";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuestionFormProps {
  onSubmit: (form: QuestionFormType, depth: number) => void;
  initialProblem?: string;
}

const CATEGORIES: Category[] = [
  "Math & Science",
  "Coding",
  "Business & Planning",
  "Writing & Foreign Language",
  "Data & Analysis",
  "Etc"
];

const CATEGORIES_KO: Record<string, string> = {
  "Math & Science": "수학ㆍ과학",
  "Coding": "코딩",
  "Business & Planning": "비즈니스ㆍ기획",
  "Writing & Foreign Language": "글쓰기ㆍ외국어",
  "Data & Analysis": "데이터ㆍ분석",
  "Etc": "기타"
};

const CATEGORIES_EN: Record<string, string> = {
  "Math & Science": "Math & Science",
  "Coding": "Coding",
  "Business & Planning": "Business & Planning",
  "Writing & Foreign Language": "Writing & Foreign Language",
  "Data & Analysis": "Data & Analysis",
  "Etc": "Etc"
};

const CATEGORY_SUGGESTIONS_KO: Record<string, string[]> = {
  "Math & Science": [
    "개념은 아는데 막상 풀려니까 안 되는 부분이 있어요",
    "공식은 외웠는데 왜 그렇게 되는지 모르겠어요",
    "문제 풀이 과정이 맞는지 확인하고 싶어요",
    "이 개념이 실생활에서 어떻게 쓰이는지 모르겠어요",
    "비슷한 유형인데 왜 어떤 건 되고 어떤 건 안 되는지 모르겠어요",
    "증명 과정을 이해하고 싶은데 어디서 막혀요",
    "개념들이 어떻게 연결되는지 모르겠어요",
    "풀이는 봤는데 왜 이렇게 푸는지 이해가 안 돼요",
    "시험에서 틀렸는데 왜 틀렸는지 모르겠어요",
    "배운 내용인데 다시 보면 낯설게 느껴져요"
  ],
  "Coding": [
    "AI가 짜준 코드가 왜 작동하는지 이해가 안 돼요",
    "오류가 났는데 어디서 틀렸는지 모르겠어요",
    "코드는 돌아가는데 이게 맞는 방식인지 모르겠어요",
    "개념은 아는데 막상 구현하려니까 막혀요",
    "라이브러리를 가져다 쓰는데 내부 동작이 궁금해요",
    "코드 구조를 어떻게 짜야 할지 모르겠어요",
    "같은 기능인데 왜 어떤 방식은 되고 어떤 건 안 되는지 모르겠어요",
    "디버깅을 어떻게 접근해야 할지 모르겠어요",
    "AI한테 계속 물어보는데 내 것이 안 되는 느낌이에요",
    "알고리즘 흐름은 아는데 코드로 옮기는 게 안 돼요"
  ],
  "Business & Planning": [
    "아이디어는 있는데 어떻게 구체화해야 할지 모르겠어요",
    "기획서를 썼는데 논리가 맞는지 모르겠어요",
    "문제는 찾았는데 해결책이 안 떠올라요",
    "시장이 있는지 없는지 판단이 안 돼요",
    "타깃이 너무 넓은 것 같은데 어떻게 좁혀야 할지 모르겠어요",
    "방향은 맞는 것 같은데 뭔가 빠진 느낌이에요",
    "경쟁사랑 뭐가 다른지 설명이 잘 안 돼요",
    "아이디어가 너무 많아서 뭘 먼저 해야 할지 모르겠어요",
    "피드백을 받았는데 어떻게 반영해야 할지 모르겠어요",
    "기획 의도는 있는데 문서로 정리가 안 돼요"
  ],
  "Writing & Foreign Language": [
    "느낌은 아는데 어떻게 표현해야 할지 모르겠어요",
    "쓰고 싶은 말은 있는데 첫 문장이 안 나와요",
    "글을 썼는데 논리가 맞는지 모르겠어요",
    "번역은 했는데 자연스러운지 모르겠어요",
    "문법은 맞는 것 같은데 어색하게 느껴져요",
    "글의 흐름이 맞는지 모르겠어요",
    "단어는 아는데 문장으로 만들기가 어려워요",
    "초안은 있는데 어떻게 다듬어야 할지 모르겠어요",
    "전달하고 싶은 건 있는데 설득력이 없는 것 같아요",
    "외국어로 말은 하는데 내 것이 된 느낌이 안 나요"
  ],
  "Data & Analysis": [
    "데이터 결과는 있는데 어떻게 해석해야 할지 모르겠어요",
    "분석은 했는데 인사이트가 안 보여요",
    "숫자는 나왔는데 이게 의미 있는 건지 모르겠어요",
    "어떤 분석 방법을 써야 할지 모르겠어요",
    "데이터가 맞는 건지 신뢰가 안 돼요",
    "결과를 어떻게 시각화해야 할지 모르겠어요",
    "상관관계인지 인과관계인지 구분이 안 돼요",
    "분석 결과를 어떻게 설명해야 할지 모르겠어요",
    "데이터는 있는데 어디서 시작해야 할지 모르겠어요",
    "AI가 뽑아준 결과가 맞는지 검증하고 싶어요"
  ],
  "Etc": [
    "뭘 모르는지 모르는 상태예요",
    "생각이 많은데 정리가 안 돼요",
    "방향은 있는데 첫 발을 못 떼고 있어요",
    "맞는 방향인지 확인하고 싶어요",
    "계속 같은 곳에서 막히는 것 같아요",
    "뭔가 빠진 것 같은데 뭔지 모르겠어요",
    "알고 있다고 생각했는데 막상 설명하려니 모르겠어요",
    "선택지가 많아서 뭘 골라야 할지 모르겠어요",
    "혼자 생각하다 막혀서 누군가 질문해줬으면 해요",
    "답은 있는 것 같은데 확신이 없어요"
  ]
};

const CATEGORY_SUGGESTIONS_EN: Record<string, string[]> = {
  "Math & Science": [
    "I understand the concept but I'm stuck on this problem.",
    "I memorized the formula but I don't know why it works.",
    "I want to check if my solution process is correct.",
    "I'm not sure how this concept is used in real life.",
    "Why does it work for some cases but not others?",
    "I'm stuck on a specific step in the proof.",
    "I don't see how these concepts are connected.",
    "I saw the solution but I don't understand the reasoning.",
    "I got this wrong on the test and don't know why.",
    "I learned this before but it feels unfamiliar today."
  ],
  "Coding": [
    "I don't understand why the AI-generated code works.",
    "I've got an error and I'm not sure where the mistake is.",
    "The code runs but is this the best approach?",
    "I know the theory but I'm stuck on the implementation.",
    "I'm using a library but I want to know its internal logic.",
    "I don't know how to structure my code effectively.",
    "Why does one method work while another fails for the same task?",
    "How should I approach debugging this issue?",
    "I keep asking the AI but I don't feel like I'm really learning.",
    "I know the algorithm but can't translate it into code."
  ],
  "Business & Planning": [
    "I have an idea but don't know how to flesh it out.",
    "I wrote a proposal but I'm not sure if the logic holds.",
    "I identified a problem but can't think of a solution.",
    "I'm not sure if there's actually a market for this.",
    "The target seems too broad, how can I narrow it down?",
    "Direction seems right but feels like something is missing.",
    "I'm struggling to explain our unique value proposition.",
    "I have too many ideas and don't know which to prioritize.",
    "I received feedback but don't know how to incorporate it.",
    "I have the vision but can't organize it into a document."
  ],
  "Writing & Foreign Language": [
    "I know the feeling but can't find the right words.",
    "I want to write something but I'm stuck on the first sentence.",
    "Is the logic of my writing sound?",
    "I translated it but does it sound natural?",
    "Grammar seems correct but it feels awkward.",
    "Does the overall flow of the text make sense?",
    "I know the vocabulary but struggle to form full sentences.",
    "I have a draft but don't know how to polish it.",
    "I have a message but it doesn't feel persuasive enough.",
    "I can speak the language but it doesn't feel like mine yet."
  ],
  "Data & Analysis": [
    "I have the results but don't know how to interpret them.",
    "I analyzed the data but can't see the key insights.",
    "I have the numbers but are they statistically significant?",
    "Which analytical method should I use for this data?",
    "I'm not sure if I can trust the data quality.",
    "How can I effectively visualize these results?",
    "Is this a correlation or a causation?",
    "How should I explain these analysis results to others?",
    "I have the data but don't know where to start.",
    "I want to verify if the AI-generated results are accurate."
  ],
  "Etc": [
    "I'm in a state of not knowing what I don't know.",
    "I have many thoughts but can't organize them.",
    "I have a direction but haven't taken the first step.",
    "I want to verify if I'm heading in the right direction.",
    "I keep getting stuck at the same point.",
    "Something feels missing but I can't put my finger on it.",
    "I thought I knew it but can't explain it to others.",
    "Too many options, I don't know which one to choose.",
    "I'm stuck in my own head and need someone to ask questions.",
    "I think I have the answer but I'm not sure."
  ]
};

export function QuestionForm({
  onSubmit,
  initialProblem
}: QuestionFormProps) {
  const { language, t } = useLanguage();
  const isMobile = useIsMobile();

  const [category, setCategory] = useState<Category>("Math & Science");
  const [problem, setProblem] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<MessageFile[]>([]);
  
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Shuffle and pick 3 suggestions when category changes
  useEffect(() => {
    const suggestions = language === 'ko' ? CATEGORY_SUGGESTIONS_KO : CATEGORY_SUGGESTIONS_EN;
    const questions = suggestions[category];
    if (questions && questions.length > 0) {
      const shuffled = [...questions].sort(() => 0.5 - Math.random());
      setSuggestedQuestions(shuffled.slice(0, 3));
      setShowSuggestions(true);
    } else {
      setSuggestedQuestions([]);
      setShowSuggestions(false);
    }
  }, [category, language]);

  useEffect(() => {
    if (initialProblem) {
      setProblem(initialProblem);
    }
  }, [initialProblem]);

  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  const isTechnical = ["Math & Science", "Coding", "Data & Analysis"].includes(category);

  const getProblemPlaceholder = (cat: Category) => {
    switch (cat) {
      case "Math & Science":
        return t('placeholderMath');
      case "Coding":
        return t('placeholderCoding');
      case "Business & Planning":
        return t('placeholderBusiness');
      case "Writing & Foreign Language":
        return t('placeholderWriting');
      case "Data & Analysis":
        return t('placeholderData');
      case "Etc":
      default:
        return t('placeholderDefault');
    }
  };
  const problemPlaceholder = getProblemPlaceholder(category);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    processFile(file);

    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (captureInputRef.current) captureInputRef.current.value = "";
  };

  const processFile = (file: File) => {
    // 1. Check size
    if (file.size > 5 * 1024 * 1024) {
      alert(t('maxFileSizeError'));
      return;
    }

    // 2. Check type & counts
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    const currentImages = attachedFiles.filter(f => f.type.startsWith('image/'));
    const currentPdfs = attachedFiles.filter(f => f.type === 'application/pdf');

    if (isImage) {
      if (currentImages.length >= 1) {
        alert(t('maxImageError'));
        return;
      }
      // Open Cropper
      const imageUrl = URL.createObjectURL(file);
      setPendingImage(imageUrl);
      setPendingFileName(file.name);
      setShowCropper(true);
    } else if (isPdf) {
      if (currentPdfs.length >= 1) {
        alert(t('maxPdfError'));
        return;
      }
      // Add directly
      addFile(file);
    } else {
      alert(t('invalidFileTypeError'));
    }
  };

  const addFile = (file: File) => {
    const newFile: MessageFile = {
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
    };
    setAttachedFiles(prev => [...prev, newFile]);
  };

  const handleCropConfirm = (blob: Blob) => {
    // Convert blob to File
    const file = new File([blob], pendingFileName, { type: "image/jpeg" });
    addFile(file);
    setShowCropper(false);
    setPendingImage(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setPendingImage(null);
  };

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.some(type => type.startsWith('image/'))) {
          const blob = await item.getType(item.types.find(type => type.startsWith('image/'))!);
          const file = new File([blob], "screenshot.png", { type: blob.type });
          processFile(file);
          return;
        }
      }
      alert(t('noImageInClipboard'));
    } catch (err) {
      console.error("Paste failed:", err);
      // Fallback for older browsers or permission issues: handlePaste event on window/document
      // For now, simpler alert
      alert(t('pasteFailed'));
    }
  };

  // Also handle Ctrl+V globally or on inputs? 
  // User asked for "Screenshot -> Paste Image (Ctrl+V)" menu item.
  // So the menu item triggers the paste handler.

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) return;

    onSubmit({
      category,
      problem: problem.trim(),
      files: attachedFiles.length > 0 ? attachedFiles : undefined
    }, 10); // Default depth is 10
  };

  const isValid = problem.trim();

  return (
    <div className="space-y-8">
      {/* Greeting Message */}
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out pt-4 pb-2 px-1 flex justify-center">
        <div className="flex items-center gap-3">
          <img src={logoImage} alt="Socrates AI Logo" className="w-9 h-9 rounded-lg shadow-sm" />
          <h1 className="text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
            {t('exploreToday')}
          </h1>
        </div>
      </div>

      {/* Category Selection */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground flex items-center gap-1">
          {t('areaSelection')} <span className="text-destructive font-bold">*</span>
        </label>
        <div className="flex justify-start">
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger className="w-full sm:w-44 h-11 bg-white border border-[#E0E0E0] rounded-xl shadow-sm text-base px-4">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-[#E0E0E0] rounded-xl shadow-lg z-50">
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="rounded-lg text-base py-2">
                {language === 'ko' ? CATEGORIES_KO[cat] : CATEGORIES_EN[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground flex items-center gap-1">
          {t('problemDescription')} <span className="text-destructive font-bold">*</span>
        </label>
        <form onSubmit={handleSubmit} className="space-y-4 relative">
        <div className="w-full">
          {/* Problem Input (Required) */}
            <div className="relative bg-white rounded-2xl border border-border shadow-sm transition-colors">
              <textarea
                className="w-full bg-transparent border-0 outline-none focus:ring-0 shadow-none p-5 text-base resize-none"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder={problemPlaceholder}
                rows={1}
                style={{ minHeight: '1.75rem' }} // ensure at least 1 line height visual
              />

              {/* File Preview inside textarea area - Bottom area */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 px-4 border-t border-border/50">
                  {attachedFiles.map(file => (
                    <div key={file.id} className="relative group/file">
                      {file.type.startsWith('image/') ? (
                        <div className="relative">
                          <img src={file.url} alt={file.name} className="w-16 h-16 object-cover rounded-lg border border-border" />
                        </div>
                      ) : (
                        <div className="w-auto h-8 px-3 flex items-center justify-center bg-muted rounded-full border border-border gap-2">
                          <FileIcon className="w-3.5 h-3.5" />
                          <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className={cn(
                          "absolute bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-0 group-hover/file:opacity-100 transition-opacity",
                          file.type.startsWith('image/') ? "-top-1 -right-1" : "-top-1 -right-1"
                        )}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-2 flex items-center justify-between">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-2 hover:bg-primary/10 rounded-xl transition-colors text-muted-foreground hover:text-primary"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {isMobile ? (
                      <>
                        <DropdownMenuItem onClick={() => captureInputRef.current?.click()}>
                          <Camera className="w-4 h-4 mr-2" />
                          {t('camera')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                          <ImageIconLucide className="w-4 h-4 mr-2" />
                          {t('photo')}
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                          <FileIcon className="w-4 h-4 mr-2" />
                          {t('fileOrPhoto')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlePaste}>
                          <Scissors className="w-4 h-4 mr-2" />
                          {t('screenshotPaste')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Hidden Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={captureInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <Button 
                  type="submit" 
                  disabled={!isValid} 
                  size="icon"
                  className={cn(
                    "rounded-xl h-10 w-10 transition-all",
                    isValid ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
                  )}
                >
                  <ArrowUp className="w-5 h-5" />
                </Button>
              </div>
            </div>
        </div>

        {/* Suggested Questions */}
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 w-[95%] sm:w-[90%] transition-all duration-300 z-10 top-full mt-4",
            showSuggestions && suggestedQuestions.length > 0 && !problem.trim()
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none"
          )}
        >
          {suggestedQuestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-white">
                <div className="flex items-center gap-2 text-muted-foreground">
                   <span className="text-sm font-medium">{language === 'ko' ? CATEGORIES_KO[category] : CATEGORIES_EN[category]}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="p-1 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
                   aria-label={t('closeSuggestions')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setProblem(question);
                    }}
                    className={cn(
                      "text-left px-5 py-3.5 text-base text-foreground/90 hover:bg-secondary/50 active:bg-secondary transition-colors",
                      idx < suggestedQuestions.length - 1 && "border-b border-border/50"
                    )}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && pendingImage && (
        <ImageCropper
          imageSrc={pendingImage}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          cropText={t('cropInstruction')}
        />
      )}
    </div>
  );
}
