import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Plus, Trash2, MessageSquare, Menu, CheckCircle2, User, LogOut, Settings, MoreVertical, Pencil, Pin, Check, X, CreditCard, Search, Star, History, Bookmark } from "lucide-react";
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
  onUpdateTitle: (id: string, newTitle: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onUpdateTitle,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );


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

  const handleRenameStart = (id: string, title: string) => {
    setEditingSessionId(id);
    setEditTitle(title);
  };

  const handleRenameSave = (id: string) => {
    if (editTitle.trim()) {
      onUpdateTitle(id, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  return (
    <aside className={`${isCollapsed ? 'w-14' : 'w-[300px]'} bg-secondary/50 flex-col h-screen transition-all duration-300 flex sticky top-0`}>
      {/* 상단: 메뉴 + 검색 + 새 대화 */}
      <div className="p-3 flex flex-col gap-4 flex-shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isCollapsed && (
          <button
            onClick={onNewSession}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors mx-auto"
            title="새 채팅"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}

        {!isCollapsed && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="채팅 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background/50 border border-border/50 rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1">
              <button
                onClick={onNewSession}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>새 채팅</span>
              </button>
            </div>
          </>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-4 py-2">
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">채팅</span>
        </div>
      )}

      {/* 중간: 대화 목록 (스크롤) */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-1 min-h-0">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm italic">
              {searchQuery ? "검색 결과가 없습니다" : "아직 대화가 없습니다"}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className="group flex items-center gap-1 rounded-lg"
              >
                <div className="flex-1 flex items-center min-w-0">
                  {editingSessionId === session.id ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        autoFocus
                        className="flex-1 bg-background border border-primary/30 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSave(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRenameSave(session.id); }}
                        className="p-1 hover:text-primary transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingSessionId(null); }}
                        className="p-1 hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelectSession(session.id)}
                      className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all min-w-0 ${activeSessionId === session.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                        }`}
                    >
                      {session.isResolved ? (
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${activeSessionId === session.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      ) : (
                        <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 text-left">{session.title}</span>
                    </button>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className={`p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all shrink-0 ${activeSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={(e) => { e.stopPropagation(); /* TODO: Implement Pin logic if needed */ }}
                    >
                      <Pin className="w-4 h-4" />
                      <span>고정</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={(e) => { e.stopPropagation(); handleRenameStart(session.id, session.title); }}
                    >
                      <Pencil className="w-4 h-4" />
                      <span>제목 변경</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('이 대화를 삭제하시겠습니까?')) {
                          onDeleteSession(session.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>삭제</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      )}

      {!isCollapsed && (
        <div className="p-3 space-y-3">

          <div className="border-t border-border/50 pt-3">
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
                  <DropdownMenuItem
                    onClick={() => navigate('/pricing')}
                    className="cursor-pointer"
                  >
                    <Star className="w-4 h-4 mr-2 text-blue-600" />
                    <span>프로 요금제로 업그레이드</span>
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
        </div>
      )}

      {isCollapsed && (
        <div className="p-2 border-t border-border/50 flex-shrink-0 flex flex-col items-center gap-4 py-4 mt-auto">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold mx-auto">
            {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
          </div>
        </div>
      )}
    </aside>
  );
}
