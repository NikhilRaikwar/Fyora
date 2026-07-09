import { Link, useNavigate } from "@tanstack/react-router";
import { EmojiAvatar } from "./EmojiAvatar";
import { BrandLink } from "./Logo";
import { useKivo } from "@/lib/mock/store";
import { useHydrated } from "@/lib/mock/useHydrated";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, LayoutDashboard, LogOut, Link2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export function Header() {
  const hydrated = useHydrated();
  const current = useKivo((s) => s.currentHandle ? s.creators[s.currentHandle] : undefined);
  const disconnect = useKivo((s) => s.disconnect);
  const navigate = useNavigate();

  const handleDisconnect = () => {
    disconnect();
    toast("Disconnected", { icon: "👋", description: "Wallet & session cleared." });
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <BrandLink />

        <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium min-w-0">
          <Link
            to="/explore"
            className="px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-secondary"
            activeProps={{ className: "px-2.5 sm:px-3 py-1.5 rounded-full bg-secondary" }}
          >
            Explore
          </Link>

          {hydrated && current ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 sm:ml-2 flex items-center gap-2 rounded-full bg-card chunky shadow-sticker-sm pl-1 pr-2 sm:pr-3 py-1 press min-w-0">
                  <EmojiAvatar emoji={current.emoji} gradient={current.gradient} size={26} />
                  <span
                    className="text-xs sm:text-sm font-semibold truncate max-w-[90px] sm:max-w-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    @{current.handle}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 rounded-2xl chunky-thick shadow-sticker-lg bg-card p-2"
              >
                <DropdownMenuLabel className="px-2 py-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Signed in as
                  </div>
                  <div
                    className="font-semibold text-sm truncate"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    @{current.handle}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/$handle", params: { handle: current.handle } })}
                  className="rounded-xl cursor-pointer gap-2 font-medium focus:bg-secondary"
                >
                  <Eye className="w-4 h-4" /> Preview page
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="rounded-xl cursor-pointer gap-2 font-medium focus:bg-secondary"
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard?.writeText(`https://fyora.app/${current.handle}`);
                    toast("Link copied", { icon: "🔗" });
                  }}
                  className="rounded-xl cursor-pointer gap-2 font-medium focus:bg-secondary"
                >
                  <Link2 className="w-4 h-4" /> Copy link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDisconnect}
                  className="rounded-xl cursor-pointer gap-2 font-semibold text-coral focus:bg-coral/15 focus:text-coral"
                >
                  <LogOut className="w-4 h-4" /> Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/onboard"
              className="ml-1 sm:ml-3 rounded-full bg-ink text-paper px-3 sm:px-4 py-2 font-semibold chunky shadow-sticker-sm press text-xs sm:text-sm whitespace-nowrap"
            >
              Claim page
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
