import React from "react";
import WorkspaceShell from "@/app/components/WorkspaceShell";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
