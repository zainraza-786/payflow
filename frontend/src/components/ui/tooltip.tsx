import * as React from "react";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <div className="relative inline-block group">{children}</div>;
}

export function TooltipTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}

export function TooltipContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`absolute bottom-full mb-2 hidden group-hover:block z-50 rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-md ${className || ''}`}>
      {children}
    </div>
  );
}
