import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-20 w-20" }[size];
  const txt = { sm: "text-lg", md: "text-xl", lg: "text-4xl" }[size];
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 group">
      <div className={`relative ${dims} flex items-center justify-center rounded-2xl bg-gradient-gold shadow-gold`}>
        <CastleIcon className="h-1/2 w-1/2 text-magic" />
        <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-gold animate-sparkle" />
      </div>
      <div className="leading-none">
        <div className={`font-display font-bold ${txt} text-magic`}>
          Genie<span className="text-gradient-gold">Hacker</span>
        </div>
      </div>
    </Link>
  );
}

export function CastleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 1l1.5 2L15 1.5V5h2V3l1.5 1.5L20 3v6h1v2h-1v10h-5v-5a3 3 0 0 0-6 0v5H4V11H3V9h1V3l1.5 1.5L7 3v2h2V1.5L10.5 3 12 1z" />
    </svg>
  );
}
