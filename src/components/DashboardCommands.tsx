"use client";

// Builds command-palette entries for the dashboard: jump to any board, or create one.

import { useRouter } from "next/navigation";
import { CommandPalette, type Command } from "./CommandPalette";

type BoardRef = { id: string; name: string };

export function DashboardCommands({ boards }: { boards: BoardRef[] }) {
  const router = useRouter();

  const commands: Command[] = [
    {
      id: "new-board",
      label: "Create new board",
      group: "Actions",
      keywords: "add create new board",
      run: () => {
        const input = document.getElementById("name") as HTMLInputElement | null;
        input?.focus();
      },
    },
    ...boards.map(
      (b): Command => ({
        id: `open-${b.id}`,
        label: `Open  ·  ${b.name}`,
        group: "Boards",
        keywords: b.name,
        run: () => router.push(`/r/${b.id}`),
      }),
    ),
  ];

  return <CommandPalette commands={commands} triggerLabel="Search boards" />;
}
