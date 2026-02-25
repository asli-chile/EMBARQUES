"use client";

import { Icon } from "@iconify/react";

type AuthIconName =
  | "typcn:user-outline"
  | "typcn:key-outline"
  | "typcn:lock-closed-outline";

type AuthIconProps = {
  icon?: AuthIconName;
  className?: string;
};

export function AuthIcon({ icon = "typcn:key-outline", className }: AuthIconProps) {
  return (
    <Icon
      icon={icon}
      width={24}
      height={24}
      className={className}
    />
  );
}
