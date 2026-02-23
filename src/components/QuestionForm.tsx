import { useState, useRef, useEffect } from "react";
import { Plus, X, FileIcon, ImageIcon, Camera, Image as ImageIconLucide, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepthSelector } from "./DepthSelector";
import { QuestionForm as QuestionFormType, Category, MessageFile, ChatMode } from "@/types/chat";
import { cn } from "@/lib/utils";
import { ImageCropper } from "./ImageCropper";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuestionFormProps {
  onSubmit: (form: QuestionFormType, depth: number, mode: ChatMode) => void;
  depth: number;
  onDepthChange: (depth: number) => void;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
}

const CATEGORIES: Category[] = [
  "수학ㆍ과학",
  "코딩",
  "비즈니스ㆍ기획",
  "글쓰기ㆍ외국어",
  "데이터ㆍ분석"
];

export function QuestionForm({
  onSubmit,
  depth,
  onDepthChange,
  chatMode,
  onChatModeChange
}: QuestionFormProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const [category, setCategory] = useState<Category>("수학ㆍ과학");
  const [problem, setProblem] = useState("");
  const [attemptsOrContext, setAttemptsOrContext] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<MessageFile[]>([]);

  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  const isTechnical = ["수학ㆍ과학", "코딩", "데이터ㆍ분석"].includes(category);
  const secondLabel = isTechnical ? "Approach" : "Context";
  const secondPlaceholder = isTechnical ? "어떤 방법을 시도해봤나요?" : "관련된 배경이나 상황을 알려주세요";

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
      alert("파일 크기는 최대 5MB입니다.");
      return;
    }

    // 2. Check type & counts
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    const currentImages = attachedFiles.filter(f => f.type.startsWith('image/'));
    const currentPdfs = attachedFiles.filter(f => f.type === 'application/pdf');

    if (isImage) {
      if (currentImages.length >= 1) {
        alert("이미지는 최대 1장까지 업로드 가능합니다.");
        return;
      }
      // Open Cropper
      const imageUrl = URL.createObjectURL(file);
      setPendingImage(imageUrl);
      setPendingFileName(file.name);
      setShowCropper(true);
    } else if (isPdf) {
      if (currentPdfs.length >= 1) {
        alert("PDF는 최대 1개까지 업로드 가능합니다.");
        return;
      }
      // Add directly
      addFile(file);
    } else {
      alert("이미지 또는 PDF 파일만 업로드 가능합니다.");
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
      alert("클립보드에 이미지가 없습니다.");
    } catch (err) {
      console.error("Paste failed:", err);
      // Fallback for older browsers or permission issues: handlePaste event on window/document
      // For now, simpler alert
      alert("스크린샷을 붙여넣을 수 없습니다.");
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
      attempts: attemptsOrContext.trim(),
      files: attachedFiles.length > 0 ? attachedFiles : undefined
    }, depth, chatMode);
  };

  const isValid = problem.trim();

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all border",
              category === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          {/* Problem Input (Required) */}
          <div className="relative group">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Problem <span className="text-red-500">*</span>
            </label>
            <div className="relative bg-secondary/30 rounded-2xl border border-border transition-colors">
              <textarea
                className="w-full bg-transparent border-0 outline-none focus:ring-0 shadow-none p-4 text-sm resize-none"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="해결하고 싶은 고민이나 문제를 입력해 주세요"
                rows={1}
                style={{ minHeight: '3rem' }} // ensure at least 1 line height visual
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

              <div className="p-2 flex items-center justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-2 hover:bg-primary/10 rounded-xl transition-colors text-muted-foreground hover:text-primary"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isMobile ? (
                      <>
                        <DropdownMenuItem onClick={() => captureInputRef.current?.click()}>
                          <Camera className="w-4 h-4 mr-2" />
                          카메라
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                          <ImageIconLucide className="w-4 h-4 mr-2" />
                          사진
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                          <FileIcon className="w-4 h-4 mr-2" />
                          파일 또는 사진
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlePaste}>
                          <Scissors className="w-4 h-4 mr-2" />
                          스크린샷 (Ctrl+V)
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
              </div>
            </div>
          </div>

          {/* Approach/Context Input */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              {secondLabel}
            </label>
            <div className="relative bg-secondary/30 rounded-2xl border border-border transition-colors">
              <textarea
                className="w-full bg-transparent border-0 outline-none focus:ring-0 shadow-none p-4 text-sm resize-none"
                value={attemptsOrContext}
                onChange={(e) => setAttemptsOrContext(e.target.value)}
                placeholder={secondPlaceholder}
                rows={2}
                style={{ minHeight: '4.5rem' }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex flex-wrap items-center gap-4">
            {chatMode === 'socrates' && (
              <DepthSelector value={depth} onChange={onDepthChange} />
            )}

            {/* Chat Mode Control */}
            <div className="inline-flex p-1 bg-secondary/50 rounded-lg border border-border/50">
              <button
                type="button"
                onClick={() => onChatModeChange('socrates')}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                  chatMode === 'socrates'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                소크라테스 모드
              </button>
              <button
                type="button"
                onClick={() => onChatModeChange('direct')}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                  chatMode === 'direct'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                즉답 모드
              </button>
            </div>
          </div>

          <Button type="submit" disabled={!isValid} className="w-full sm:w-auto rounded-xl px-8 h-11 font-semibold">
            질문하기
          </Button>
        </div>
      </form>

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
