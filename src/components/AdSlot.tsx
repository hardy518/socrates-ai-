export function AdSlot() {
  return (
    <aside className="w-[300px] bg-background flex-shrink-0 hidden lg:block">
      <div className="sticky top-0 h-screen flex items-start justify-center p-6 pt-20">
        <div className="w-full h-[500px] bg-transparent rounded-xl flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-sm font-medium mb-1"></div>
            <div className="text-xs"></div>
          </div>
        </div>
      </div>
    </aside>
  );
}