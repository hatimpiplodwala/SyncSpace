"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  name,
  color,
  signOutAction,
}: {
  name: string;
  color: string;
  signOutAction: () => void | Promise<void>;
}) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40">
        <Avatar className="ring-2 ring-white shadow-[var(--shadow-soft)]">
          <AvatarFallback
            className="text-white"
            style={{ backgroundColor: color }}
          >
            {initial}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium text-foreground sm:inline">
          {name}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuLabel className="text-muted-foreground">
          Signed in as{" "}
          <span className="font-semibold text-foreground">{name}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem variant="destructive" asChild>
            <button type="submit" className="w-full">
              <LogOut className="size-4" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
