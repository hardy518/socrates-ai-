import { Plus, Trash2, MessageSquare, Menu, CheckCircle2, User, LogOut, Settings } from "lucide-react";
import { ChatSession } from "@/types/chat";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ 
  sessions, 
  activeSessionId, 
  onSelectSession, 
  onNewSession,
  onDeleteSession,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const { user, signInWithGoogle, signOut } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("로그인 오류:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  return (
    <aside className={`${isCollapsed ? 'w-14' : 'w-64'} bg-secondary/50 flex-col h-screen transition-all duration-300 flex`}>
      {/* 상단: 메뉴 + 새 대화 */}
      <div className="p-3 flex flex-col gap-2 flex-shrink-0">
        <button 
          onClick={onToggleCollapse}
          className="flex-shrink-0 p-2.5 rounded-lg text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors self-start"
        >
          <Menu className="w-5 h-5" />
        </button>
        {!isCollapsed && (
          <button 
            onClick={onNewSession}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 대화
          </button>
        )}
      </div>

      {/* 중간: 대화 목록 (스크롤) */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1 min-h-0">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              아직 대화가 없습니다
            </div>
          ) : (
            sessions.map((session) => (
              <div 
                key={session.id}
                className="group flex items-center gap-1 rounded-lg"
              >
                <button
                  onClick={() => onSelectSession(session.id)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeSessionId === session.id 
                      ? 'bg-secondary text-foreground' 
                      : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                  }`}
                >
                  {session.isResolved ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[hsl(var(--growth-gauge))]" />
                  ) : (
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="truncate flex-1 text-left">{session.title}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center py-3 space-y-2 min-h-0">
          <button 
            onClick={onNewSession}
            className="p-2.5 rounded-lg text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
            title="새 대화"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 하단: 프로필 */}
      {/* 하단: 프로필 */}
{!isCollapsed && (
  <div className="p-3 border-t border-border/50 flex-shrink-0">
    {user && !user.isAnonymous ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full h-auto p-2 rounded-lg text-foreground hover:bg-secondary/80 hover:text-foreground transition-colors justify-start"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate flex-1 text-left">
                {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || "사용자"}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-64 mb-2">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
              {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user.displayName || "사용자"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user.email}
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
            <Settings className="w-4 h-4 mr-2" />
            <span>설정</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>로그아웃</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <Button 
        onClick={handleSignIn}
        variant="outline" 
        className="w-full justify-start"
      >
        <User className="w-4 h-4 mr-2" />
        로그인
      </Button>
    )}
  </div>
)}

{isCollapsed && user && !user.isAnonymous && (
  <div className="p-2 border-t border-border/50 flex-shrink-0">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium mx-auto">
      {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
    </div>
  </div>
)}
    </aside>
  );
}
