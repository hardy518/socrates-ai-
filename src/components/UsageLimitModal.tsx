import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { checkIsPro } from "@/utils/subscription";

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsageLimitModal({ isOpen, onClose }: UsageLimitModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      if (user) {
        const proStatus = await checkIsPro(user.uid);
        setIsPro(proStatus);
      }
      setLoading(false);
    };

    if (isOpen) {
      checkStatus();
    }
  }, [isOpen, user]);

  const handleUpgrade = () => {
    onClose();
    navigate("/pricing");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border-none shadow-2xl rounded-3xl p-8">
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <span className="material-icons text-3xl text-primary">auto_awesome</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-center text-slate-900 dark:text-white">
            사용량을 모두 사용했어요
          </DialogTitle>
          <DialogDescription className="text-center text-slate-500 dark:text-slate-400 text-base leading-relaxed">
            {isPro 
              ? "이미 Pro 멤버십을 이용 중이시네요! 원활한 서비스 제공을 위해 설정된 기간별 사용량 한도에 도달했습니다. 잠시 후 다시 이용해 주세요."
              : "소크라테스 AI와 더 깊은 대화를 나누고 싶으신가요? Pro 플랜으로 업그레이드하면 더 넉넉한 대화 한도와 추가 기능을 이용할 수 있습니다."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
          >
            닫기
          </Button>
          {!isPro && (
            <Button
              onClick={handleUpgrade}
              className="flex-[1.5] h-12 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-lg shadow-primary/25"
            >
              Pro로 업그레이드하기
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
