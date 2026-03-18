import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUp, Square, Plus, X, FileIcon, ImageIcon, Camera, Image as ImageIconLucide, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageFile } from "@/types/chat";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { ImageCropper } from "./ImageCropper";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInputProps {
  onSend: (message: string, files?: MessageFile[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatInput({
  onSend,
  isLoading,
  disabled,
  placeholder = "이어서 생각해 볼까요?",
  autoFocus = false
}: ChatInputProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<MessageFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  // 로그아웃 시 입력창 초기화
  useEffect(() => {
    if (!user) {
      setInput("");
      setAttachedFiles([]);
    }
  }, [user]);

  // autoFocus 처리
  useEffect(() => {
    if (autoFocus && !disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFile(files[0]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (captureInputRef.current) captureInputRef.current.value = "";
  };

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert(t('maxFileSizeError'));
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const currentImages = attachedFiles.filter(f => f.type.startsWith('image/'));
    const currentPdfs = attachedFiles.filter(f => f.type === 'application/pdf');

    if (isImage) {
      if (currentImages.length >= 1) {
        alert(t('maxImageError'));
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setPendingImage(imageUrl);
      setPendingFileName(file.name);
      setShowCropper(true);
    } else if (isPdf) {
      if (currentPdfs.length >= 1) {
        alert(t('maxPdfError'));
        return;
      }
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
      alert(t('pasteFailed'));
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) URL.revokeObjectURL(fileToRemove.url);
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || disabled || isLoading) return;

    onSend(input.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
    setInput("");
    setAttachedFiles([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isValid = input.trim().length > 0 || attachedFiles.length > 0;

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="relative flex flex-col w-full bg-background border border-black/10 rounded-xl shadow-sm transition-all shadow-input overflow-hidden"
      >
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 px-4 border-b border-black/5 bg-black/[0.02]">
            {attachedFiles.map(file => (
              <div key={file.id} className="relative group/file">
                {file.type.startsWith('image/') ? (
                  <img src={file.url} alt={file.name} className="w-12 h-12 object-cover rounded-lg border border-black/10" />
                ) : (
                  <div className="h-12 px-3 flex items-center bg-muted rounded-lg border border-black/10 gap-2">
                    <FileIcon className="w-4 h-4" />
                    <span className="text-xs truncate max-w-[80px]">{file.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-0 group-hover/file:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-[44px] max-h-32 overflow-y-auto scrollbar-thin">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent border-0 resize-none px-4 py-3 focus:ring-0 focus:outline-none placeholder:text-muted-foreground/70 text-base"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
        </div>

        <div className="flex justify-between items-center px-3 pb-3 pt-1">
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-lg text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {isMobile ? (
                  <>
                    <DropdownMenuItem onClick={() => captureInputRef.current?.click()} className="cursor-pointer">
                      <Camera className="w-4 h-4 mr-2" />
                      {t('camera')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                      <ImageIconLucide className="w-4 h-4 mr-2" />
                      {t('photo')}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                      <FileIcon className="w-4 h-4 mr-2" />
                      {t('fileOrPhoto')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePaste} className="cursor-pointer">
                      <Scissors className="w-4 h-4 mr-2" />
                      {t('screenshotPaste')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
            <input ref={captureInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          </div>

          <Button
            type="submit"
            disabled={(!isValid && !isLoading) || (isLoading && !isValid && !disabled)}
            size="icon"
            className={`rounded-lg w-9 h-9 transition-all duration-200 ${isValid || isLoading
              ? "bg-primary text-primary-foreground opacity-100 scale-100 shadow-md hover:bg-primary/90"
              : "bg-[#E5E5E5] text-muted-foreground/60 opacity-80 scale-95 pointer-events-none"
              }`}
          >
            {isLoading ? (
              <Square className="w-4 h-4 fill-current stroke-[3px]" />
            ) : (
              <ArrowUp className="w-5 h-5 stroke-[2.5px]" />
            )}
          </Button>
        </div>
      </form>

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
