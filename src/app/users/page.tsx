import React from "react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STLE } from "@/lib/formatters";
import { UsersClient } from "@/components/admin/users-client";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UsersPage() {
  const [users, stleConfig] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.systemConfig.findUnique({
      where: { key: "STLE_PER_GRAM" },
    }),
  ]);

  const formattedUsers = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    active: u.active,
    branch: u.branch,
    lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
    updatedAt: u.updatedAt.toISOString(),
  }));

  const initialStle = stleConfig ? Number(stleConfig.value) || DEFAULT_STLE : DEFAULT_STLE;

  return (
    <RoleGate allowedRoles={["ADMIN_IT"]} pageTitle="Manajemen User">
      <UsersClient initialUsers={formattedUsers} initialStle={initialStle} />
    </RoleGate>
  );
}
