import { Plus, Trash2, MessageSquare, Menu, X, CheckCircle2, Search, Settings, Star, Bookmark, MoreVertical, Pin, PinOff, Pencil, LogOut, User, LayoutDashboard, Headset, Share2, Languages, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { ChatSession } from "@/types/chat";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
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

interface MobileSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MobileSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onUpdateTitle,
  onTogglePin,
  open,
  onOpenChange,
}: MobileSidebarProps) {
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="h-full w-[300px] p-0 flex flex-col bg-[#F0F0F0] border-r border-border/50 shadow-xl [&>button]:hidden text-black"
      >

        {/* Search & New Chat - Fixed at top below header */}
        <div className="px-3 py-4 pt-[env(safe-area-inset-top,20px)] space-y-4 flex-shrink-0">
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

          <SheetClose asChild>
            <button
              onClick={onNewSession}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-black bg-black/5 hover:bg-black/10 transition-all"
            >
              <Plus className="w-5 h-5 text-black" />
              <span>{t('newSession')}</span>
            </button>
          </SheetClose>
        </div>

        {/* Chat List - Scrollable middle part */}
        <div className="px-5 py-2 flex-shrink-0">
          <span className="text-xs font-bold text-black/60 uppercase tracking-wider">{t('sessions')}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
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
                  <SheetClose asChild>
                    <button
                      onClick={() => onSelectSession(session.id)}
                      className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all min-w-0 ${activeSessionId === session.id
                        ? 'bg-primary text-white font-medium shadow-sm'
                        : 'text-black hover:bg-black/5'
                        }`}
                    >
                      {session.isResolved ? (
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${activeSessionId === session.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      ) : (
                        <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 text-left">{session.title}</span>
                    </button>
                  </SheetClose>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all shrink-0 opacity-100"
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

        {/* Profile Section - Fixed at bottom */}
        <div className="p-3 border-t border-border/50 bg-background mt-auto flex flex-col gap-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full h-auto p-3 rounded-xl transition-all justify-start gap-3 hover:bg-secondary/80",
              location.pathname === "/my-insight" ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "text-foreground"
            )}
            onClick={() => {
              navigate("/my-insight");
              onOpenChange(false);
            }}
          >
            <LayoutDashboard className={cn("w-5 h-5", location.pathname === "/my-insight" ? "text-[#7C3AED]" : "text-black")} />
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-black text-sm">{t('myInsight')}</span>
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
                  className="w-full h-auto p-2 rounded-lg text-foreground hover:bg-secondary transition-colors justify-start"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                    </div>
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className="text-sm font-medium truncate w-full flex items-center gap-2">
                        {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || t('user')}
                        {isPro && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">Pro Plan</span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate w-full">
                        {user?.email}
                      </span>
                    </div>
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
                        {isPro && (
                          <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold inline-flex items-center">Pro Plan</span>
                        )}
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
                  className="cursor-pointer"
                >
                  <Headset className="w-4 h-4 mr-2" />
                  <span>{t('customerCenter')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { navigate('/settings'); }}
                  className="cursor-pointer"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span>{t('settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/pricing')}
                  className={cn(
                    "cursor-pointer font-bold",
                    isPro ? "text-muted-foreground" : "text-primary"
                  )}
                >
                  {isPro ? <CreditCard className="w-4 h-4 mr-2" /> : <Star className="w-4 h-4 mr-2 text-blue-600" />}
                  <span>{t('upgradeToProLong')}</span>
                </DropdownMenuItem>
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
                  className="text-red-600 focus:text-red-600"
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
              className="w-full justify-start rounded-xl"
            >
              <User className="w-4 h-4 mr-2" />
              {t('login')}
            </Button>
          )}
        </div>
      </SheetContent>
      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onRename={handleRenameSave}
        initialTitle={editingTitle}
      />
    </Sheet>
  );
}
