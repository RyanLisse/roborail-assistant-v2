"use client";

import { ChevronUp } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function SidebarUserNav() {
  const { setTheme, theme } = useTheme();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              data-testid="user-nav-button"
              className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10"
            >
              <Image
                src="https://avatar.vercel.sh/anonymous"
                alt="Anonymous User"
                width={24}
                height={24}
                className="rounded-full"
              />
              <span data-testid="user-email" className="truncate">
                Anonymous User
              </span>
              <ChevronUp className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-testid="user-nav-menu"
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem
              data-testid="user-nav-item-theme"
              className="cursor-pointer"
              onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {`Toggle ${theme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}