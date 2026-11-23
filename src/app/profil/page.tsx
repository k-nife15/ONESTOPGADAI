import React from "react";
import { ProfilClient } from "@/components/shared/profil-client";
import { RoleGate } from "@/components/shared/role-gate";

export default function ProfilPage() {
  return (
    <RoleGate
      allowedRoles={["PENAKSIR", "PEMUTUS", "BACK_OFFICE", "ADMIN_IT"]}
      pageTitle="Pengaturan Profil & Sandi"
    >
      <ProfilClient />
    </RoleGate>
  );
}
