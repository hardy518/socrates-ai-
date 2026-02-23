import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const PaymentFail = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const code = searchParams.get("code");
    const message = searchParams.get("message");

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
            <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">결제에 실패했어요</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {message || "잠시 후 다시 시도해 주세요."}
                    </p>
                </div>

                {code && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 text-left text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">오류 코드</span>
                            <span className="font-medium text-red-500">{code}</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => navigate("/")}
                        className="flex-1 py-6 rounded-xl"
                    >
                        홈으로
                    </Button>
                    <Button
                        onClick={() => navigate("/pricing")}
                        className="flex-1 py-6 font-bold rounded-xl"
                    >
                        다시 시도
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PaymentFail;
