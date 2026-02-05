import { Plus, Trash2, MessageSquare, Menu, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatSession } from "@/types/chat";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface MobileSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

export function MobileSidebar({ 
  sessions, 
  activeSessionId, 
  onSelectSession, 
  onNewSession,
  onDeleteSession,
}: MobileSidebarProps) {
  return (
    <Drawer direction="left">
      <DrawerTrigger asChild>
        <Button 
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden rounded-lg hover:bg-secondary"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full w-[280px] rounded-none fixed left-0 top-0 bottom-0 bg-secondary/30">
        <div className="flex flex-col h-full">
          <div className="p-3 flex items-center justify-between">
            <span className="font-medium text-foreground">대화 목록</span>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="rounded-lg hover:bg-secondary/80">
                <X className="w-5 h-5" />
              </Button>
            </DrawerClose>
          </div>

          <div className="p-3">
            <DrawerClose asChild>
              <Button 
                onClick={onNewSession}
                variant="ghost"
                className="w-full justify-start gap-2 rounded-xl hover:bg-secondary/80"
              >
                <Plus className="w-4 h-4" />
                새 대화
              </Button>
            </DrawerClose>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
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
                  <DrawerClose asChild>
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
                  </DrawerClose>
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
        </div>
      </DrawerContent>
    </Drawer>
  );
}
