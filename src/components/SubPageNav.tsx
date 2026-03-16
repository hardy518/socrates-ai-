import React from 'react';
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
}

interface SubPageNavProps {
  items: NavItem[];
  activeId: string;
  onItemClick: (id: string) => void;
  className?: string;
}

export const SubPageNav: React.FC<SubPageNavProps> = ({
  items,
  activeId,
  onItemClick,
  className
}) => {
  return (
    <nav className={cn(
      "sticky top-16 z-30 bg-white/80 backdrop-blur-md border-b border-border transition-all duration-300",
      className
    )}>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-3 scroll-smooth">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0",
              activeId === item.id 
                ? "bg-secondary text-black shadow-sm" 
                : "text-black/60 hover:text-black hover:bg-secondary/40"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
};
