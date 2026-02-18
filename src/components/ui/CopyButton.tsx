import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CopyButtonProps {
    content: string;
    className?: string;
}

export function CopyButton({ content, className = "" }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            toast.success("클립보드에 복사되었습니다.", {
                duration: 2000,
                position: "bottom-center",
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("복사에 실패했습니다.");
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`p-2 rounded-lg bg-background/50 backdrop-blur-sm shadow-sm hover:bg-accent hover:text-accent-foreground transition-all active:scale-95 group relative ${className}`}
            title="복사하기"
        >
            {copied ? (
                <Check className="w-4 h-4 text-green-500" />
            ) : (
                <Copy className="w-4 h-4" />
            )}

            {/* Tooltip */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {copied ? "복사됨" : "복사"}
            </span>
        </button>
    );
}
