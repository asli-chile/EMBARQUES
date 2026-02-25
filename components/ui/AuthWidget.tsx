"use client";

import { useState } from "react";
import { AuthIcon } from "./AuthIcon";
import { AuthModal } from "./AuthModal";
import { siteConfig } from "@/lib/site";

export function AuthWidget() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => setIsModalOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center justify-center w-10 h-10 text-brand-blue hover:bg-neutral-200/80 rounded-full transition-all duration-200"
        aria-label="Ver perfil de usuario"
      >
        <AuthIcon icon={siteConfig.authIcon} className="text-brand-blue" />
      </button>
      <AuthModal isOpen={isModalOpen} onClose={handleClose} />
    </>
  );
}
