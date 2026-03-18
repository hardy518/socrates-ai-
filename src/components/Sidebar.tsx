import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Plus, Trash2, MessageSquare, Menu, CheckCircle2, User, LogOut, Settings, MoreVertical, Pencil, Pin, PinOff, Check, X, CreditCard, Search, Star, History, Bookmark, LayoutDashboard, Headset, Share2, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { RenameModal } from "./RenameModal";
import { checkIsPro } from "@/utils/subscription";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
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
  onTogglePin,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInsightBadge, setShowInsightBadge] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    if (user && !user.isAnonymous) {
      checkIsPro(user.uid).then(setIsPro);
      const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
        if (doc.exists()) {
          setShowInsightBadge(doc.data().insightBadge === true);
        }
      });
      return () => unsub();
    }
  }, [user]);

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
    setEditingTitle(title);
    setIsRenameModalOpen(true);
  };

  const handleRenameSave = (newTitle: string) => {
    if (editingSessionId && newTitle.trim()) {
      onUpdateTitle(editingSessionId, newTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleShare = async (session: ChatSession) => {
    const url = `${window.location.origin}?session=${session.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: session.title,
          url: url
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error(t('shareConversation') + " " + t('failed'));
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t('shareLinkCopied'));
    }
  };

  return (
    <aside className={`${isCollapsed ? 'w-14' : 'w-[300px]'} bg-[#F0F0F0] text-black flex-col h-screen transition-all duration-300 flex sticky top-0 border-r border-border/50`}>
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
            className="p-2 rounded-lg text-black hover:bg-black/5 transition-colors mx-auto"
            title={t('newSession')}
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
                placeholder={t('searchChat')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-black"
              />
            </div>

            <div className="space-y-1">
              <button
                onClick={onNewSession}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-black hover:bg-black/5 transition-all"
              >
                <Plus className="w-5 h-5 text-black" />
                <span>{t('newSession')}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-4 py-2">
          <span className="text-xs font-bold text-black/60 uppercase tracking-wider">{t('sessions')}</span>
        </div>
      )}

      {/* 중간: 대화 목록 (스크롤) */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-1 min-h-0">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm italic">
              {searchQuery ? t('noSearchResults') : t('noConversations')}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className="group flex items-center gap-1 rounded-lg"
              >
                <div className="flex-1 flex items-center min-w-0">
                  <button
                    onClick={() => onSelectSession(session.id)}
                    className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all min-w-0 ${activeSessionId === session.id
                      ? 'bg-primary text-white font-medium shadow-sm'
                      : 'text-black hover:bg-black/5'
                      }`}
                  >
                     {session.isResolved ? (
                       <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${activeSessionId === session.id ? 'text-white' : 'text-black/60'}`} />
                     ) : (
                       <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeSessionId === session.id ? 'text-white' : 'text-black/60'}`} />
                     )}
                    <span className="truncate flex-1 text-left">{session.title}</span>
                  </button>
                </div>

                <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <button
                       onClick={(e) => e.stopPropagation()}
                       className={`p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all shrink-0 ${session.isPinned || activeSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                         }`}
                     >
                       {session.isPinned ? (
                         <Pin className="w-4 h-4 text-primary" />
                       ) : (
                         <MoreVertical className="w-4 h-4" />
                       )}
                     </button>
                   </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={(e) => { e.stopPropagation(); handleShare(session); }}
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{t('shareConversation')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={(e) => { e.stopPropagation(); onTogglePin(session.id, !session.isPinned); }}
                    >
                      {session.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      <span>{session.isPinned ? t('unpin') : t('pin')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={(e) => { e.stopPropagation(); handleRenameStart(session.id, session.title); }}
                    >
                      <Pencil className="w-4 h-4" />
                      <span>{t('rename')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t('deleteChatConfirm'))) {
                          onDeleteSession(session.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('delete')}</span>
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

          <div className="border-t border-border/50 pt-3 flex flex-col gap-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full h-auto p-3 rounded-xl transition-all justify-start gap-3 hover:bg-secondary/80",
                location.pathname === "/my-insight" ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "text-foreground"
              )}
              onClick={() => navigate("/my-insight")}
            >
              <LayoutDashboard className={cn("w-5 h-5", location.pathname === "/my-insight" ? "text-[#7C3AED]" : "text-black")} />
              <div className="flex items-center gap-2 flex-1">
                <span className="font-semibold text-black">{t('myInsight')}</span>
                {showInsightBadge && (
                  <div className="w-2 h-2 rounded-full bg-[#8B5CF6] shrink-0" />
                )}
              </div>
            </Button>

            {user && !user.isAnonymous ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-2 rounded-lg text-foreground hover:bg-secondary/80 hover:text-foreground transition-colors justify-start"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                      </div>
                      <span className="text-sm font-medium truncate flex-1 text-left">
                        {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || t('user')}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-64 mb-2">
                  <div className="flex items-center gap-3 px-2 py-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {user?.displayName || t('user')}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => {
                      window.open('https://socratestutor.channel.io', '_blank');
                    }}
                    className="cursor-pointer gap-3 p-3 rounded-xl"
                  >
                    <Headset className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{t('customerCenter')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/settings')}
                    className="cursor-pointer gap-3 p-3 rounded-xl"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{t('settings')}</span>
                  </DropdownMenuItem>
                  {!isPro && (
                    <DropdownMenuItem
                      onClick={() => navigate('/pricing')}
                      className="cursor-pointer gap-3 p-3 rounded-xl text-primary font-bold"
                    >
                      <Star className="w-4 h-4 mr-2 text-blue-600" />
                      <span>{t('upgradeToProLong')}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">{t('language')}</p>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setLanguage('ko'); }}
                        className={cn(
                          "flex-1 h-8 rounded-lg font-bold text-[11px] transition-all",
                          language === 'ko' ? "bg-black text-white" : "text-black/40 hover:text-black hover:bg-black/5"
                        )}
                      >
                        한국어
                      </Button>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setLanguage('en'); }}
                        className={cn(
                          "flex-1 h-8 rounded-lg font-bold text-[11px] transition-all",
                          language === 'en' ? "bg-black text-white" : "text-black/40 hover:text-black hover:bg-black/5"
                        )}
                      >
                        English
                      </Button>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>{t('logout')}</span>
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
                {t('login')}
              </Button>
            )}
          </div>
        </div>
      )}

      {isCollapsed && (
        <div className="p-2 border-t border-border/50 flex-shrink-0 flex flex-col items-center gap-4 py-4 mt-auto">
          {user && !user.isAnonymous ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold mx-auto hover:ring-2 hover:ring-primary/20 transition-all">
                  {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-64 mb-2 ml-2">
                <div className="flex items-center gap-3 px-2 py-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                    {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {user?.displayName || t('user')}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />

                <DropdownMenuItem 
                  className="gap-3 p-3 rounded-xl cursor-pointer"
                  onClick={() => navigate("/my-insight")}
                >
                  <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-medium">{t('myInsight')}</span>
                    {showInsightBadge && (
                      <div className="w-2 h-2 rounded-full bg-[#8B5CF6] shrink-0" />
                    )}
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    window.open('https://socratestutor.channel.io', '_blank');
                  }}
                  className="cursor-pointer gap-3 p-3 rounded-xl"
                >
                  <Headset className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{t('customerCenter')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/settings')}
                  className="cursor-pointer gap-3 p-3 rounded-xl"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{t('settings')}</span>
                </DropdownMenuItem>
                {!isPro && (
                  <DropdownMenuItem
                    onClick={() => navigate('/pricing')}
                    className="cursor-pointer gap-3 p-3 rounded-xl text-primary font-bold"
                  >
                    <Star className="w-4 h-4 mr-2 text-blue-600" />
                    <span>{t('upgradeToProLong')}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button 
              onClick={handleSignIn}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all"
            >
              <User className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onRename={handleRenameSave}
        initialTitle={editingTitle}
      />
    </aside>
  );
}
