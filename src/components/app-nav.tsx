"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AudioLines, Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "语音合成", icon: AudioLines },
  { href: "/voices", label: "声音库", icon: Mic2 },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <AudioLines className="size-4" />
          </span>
          Voice Clone
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
          本地部署 · 仅自己使用
        </span>
      </div>
    </header>
  );
}
