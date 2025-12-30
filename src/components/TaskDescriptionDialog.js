"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDesc,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { AlignLeft } from "lucide-react";

export default function TaskDescriptionDialog({ open, onOpenChange, task }) {
  const title = task?.task_name || "Task";
  const raw = String(task?.task_description || "").trim();
  const desc = raw ? raw : "No description added.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlignLeft className="h-5 w-5" />
            Description — {title}
          </DialogTitle>
          <DialogDesc>Full task description.</DialogDesc>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/20 p-4 max-h-[60vh] overflow-y-auto">
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {desc}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button className="cursor-pointer" variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
