import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FixedLayoutProps {
  /** 상단 고정 영역 (헤더, 요약 등) */
  header?: ReactNode;
  /** 스크롤되는 중앙 콘텐츠 영역 */
  children: ReactNode;
  /** 하단 고정 영역 (입력창, 버튼 등) */
  footer?: ReactNode;
  /** 컨테이너 className */
  className?: string;
  /** 스크롤 영역 className */
  scrollClassName?: string;
}

/**
 * 고정 헤더 + 스크롤 본문 + 고정 푸터 3단 레이아웃
 * 
 * @example
 * <FixedLayout
 *   header={<SessionHeader />}
 *   footer={<ChatInput />}
 * >
 *   <MessageList />
 * </FixedLayout>
 */
export const FixedLayout = forwardRef<HTMLDivElement, FixedLayoutProps>(
  ({ header, children, footer, className, scrollClassName }, ref) => {
    return (
      <div className={cn("flex flex-col h-full overflow-hidden", className)}>
        {/* ===== 1. 고정 헤더 영역 (Sticky Top) ===== */}
        {header && (
          <div className="flex-shrink-0 z-50 bg-background">
            {header}
          </div>
        )}

        {/* ===== 2. 스크롤 콘텐츠 영역 (Scrollable Middle) ===== */}
        <div 
          ref={ref} 
          className={cn("flex-1 overflow-y-auto min-h-0", scrollClassName)}
        >
          {children}
        </div>

        {/* ===== 3. 고정 푸터 영역 (Sticky Bottom) ===== */}
        {footer && (
          <div className="flex-shrink-0 z-50 bg-background">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

FixedLayout.displayName = "FixedLayout";
