"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminHotkey() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Press F2 or Ctrl+Shift+A to instantly navigate to Admin Portal
      if (e.key === "F2" || (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a"))) {
        e.preventDefault();
        router.push("/admin/login");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
