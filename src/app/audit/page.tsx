import React from "react";
import { prisma } from "@/lib/prisma";
import { AuditClient } from "@/components/admin/audit-client";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
  });

  return (
    <RoleGate allowedRoles={["ADMIN_IT"]} pageTitle="Jejak Audit Aktivitas">
      <AuditClient initialLogs={logs} />
    </RoleGate>
  );
}
