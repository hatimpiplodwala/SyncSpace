"use client";

// Headless command-palette wiring for the room page: opens via ⌘K only.
// Adds "copy share link", "back to boards", and "sign out" to the global palette.

import { useRouter } from "next/navigation";
import { signOut } from "@/app/actions";
import { CommandPalette, type Command } from "./CommandPalette";

export function RoomCommands({
  roomId,
  inviteToken,
  isOwner,
}: {
  roomId: string;
  inviteToken: string;
  isOwner: boolean;
}) {
  const router = useRouter();

  const commands: Command[] = [
    {
      id: "open-boards",
      label: "Back to your boards",
      group: "Navigation",
      keywords: "boards dashboard home back",
      run: () => router.push("/"),
    },
  ];

  // Only owners share via the dialog; everyone with the page open has the URL.
  if (isOwner) {
    commands.push({
      id: "copy-share-link",
      label: "Copy share link",
      group: "Actions",
      keywords: "share invite link copy url",
      run: () => {
        const url = `${window.location.origin}/r/${roomId}?t=${inviteToken}`;
        void navigator.clipboard?.writeText(url);
      },
    });
  }

  commands.push({
    id: "sign-out",
    label: "Sign out",
    group: "Account",
    keywords: "signout logout exit",
    run: () => void signOut(),
  });

  return <CommandPalette commands={commands} showTrigger={false} />;
}
