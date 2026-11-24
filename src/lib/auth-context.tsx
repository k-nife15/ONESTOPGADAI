"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserRole } from "./types";

export interface ActiveUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  initials: string;
  branch: string;
}

export const DEMO_USERS: Record<UserRole, ActiveUser> = {
  PENAKSIR: {
    id: "u-penaksir",
    username: "19940812.ahmad",
    name: "Ahmad Hidayat",
    role: "PENAKSIR",
    roleLabel: "Penaksir Senior",
    initials: "AH",
    branch: "Kantor Pusat Ponorogo",
  },
  PEMUTUS: {
    id: "u-pemutus",
    username: "19780410.arifin",
    name: "Drs. H. M. Arifin, M.M.",
    role: "PEMUTUS",
    roleLabel: "Pemutus Pembiayaan",
    initials: "MA",
    branch: "Kantor Pusat Ponorogo",
  },
  BACK_OFFICE: {
    id: "u-backoffice",
    username: "19961120.rina",
    name: "Rina Wulandari",
    role: "BACK_OFFICE",
    roleLabel: "Back Office / Admin",
    initials: "RW",
    branch: "Kantor Pusat Ponorogo",
  },
  ADMIN_IT: {
    id: "u-admin",
    username: "19900215.slamet",
    name: "Slamet Widodo",
    role: "ADMIN_IT",
    roleLabel: "Super Admin IT",
    initials: "SW",
    branch: "Kantor Pusat Ponorogo",
  },
};

interface AuthContextType {
  user: ActiveUser;
  setRole: (role: UserRole) => void;
  setActiveUser: (next: {
    id?: string;
    username: string;
    name: string;
    role: UserRole;
    branch?: string;
  }) => void;
  loginWithUsername: (username: string, branch?: string) => ActiveUser;
  logout: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  PENAKSIR: "Penaksir (Maker)",
  PEMUTUS: "Pemutus (Checker 1)",
  BACK_OFFICE: "Back Office (Checker 2)",
  ADMIN_IT: "Admin IT / Governance",
};

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ActiveUser>(DEMO_USERS.PENAKSIR);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const savedUserRaw = localStorage.getItem("osg_active_user");
        if (savedUserRaw) {
          const parsed = JSON.parse(savedUserRaw);
          if (parsed && parsed.role && DEMO_USERS[parsed.role as UserRole]) {
            setUser(parsed);
            return;
          }
        }
        const savedRole = localStorage.getItem("osg_active_role") as UserRole | null;
        if (savedRole && DEMO_USERS[savedRole]) {
          const savedBranch = localStorage.getItem("osg_active_branch");
          setUser({
            ...DEMO_USERS[savedRole],
            branch: savedBranch || DEMO_USERS[savedRole].branch,
          });
        }
      } catch {
        // Ignore storage read errors
      }
    });
  }, []);

  const setRole = (role: UserRole) => {
    const selected = DEMO_USERS[role];
    if (selected) {
      setUser(selected);
      localStorage.setItem("osg_active_role", role);
      localStorage.setItem("osg_active_user", JSON.stringify(selected));
    }
  };

  const setActiveUser = (next: {
    id?: string;
    username: string;
    name: string;
    role: UserRole;
    branch?: string;
  }) => {
    const fallback = DEMO_USERS[next.role] || DEMO_USERS.PENAKSIR;
    const built: ActiveUser = {
      id: next.id || fallback.id,
      username: next.username,
      name: next.name,
      role: next.role,
      roleLabel: ROLE_LABELS[next.role] || fallback.roleLabel,
      branch: next.branch || fallback.branch,
      initials: makeInitials(next.name),
    };
    setUser(built);
    localStorage.setItem("osg_active_role", built.role);
    localStorage.setItem("osg_active_branch", built.branch);
    localStorage.setItem("osg_active_user", JSON.stringify(built));
  };

  const loginWithUsername = (username: string, branch?: string): ActiveUser => {
    const u = username.toLowerCase();
    let matchedRole: UserRole = "PENAKSIR";
    if (u.includes("arifin") || u.includes("pemutus")) matchedRole = "PEMUTUS";
    else if (u.includes("rina") || u.includes("bo") || u.includes("back")) matchedRole = "BACK_OFFICE";
    else if (u.includes("slamet") || u.includes("it") || u.includes("admin")) matchedRole = "ADMIN_IT";

    const nextUser = {
      ...DEMO_USERS[matchedRole],
      branch: branch || DEMO_USERS[matchedRole].branch,
    };
    setUser(nextUser);
    localStorage.setItem("osg_active_role", matchedRole);
    localStorage.setItem("osg_active_user", JSON.stringify(nextUser));
    if (branch) {
      localStorage.setItem("osg_active_branch", branch);
    }
    return nextUser;
  };

  const logout = () => {
    try {
      localStorage.removeItem("osg_active_user");
      localStorage.removeItem("osg_active_role");
      localStorage.removeItem("osg_active_branch");
    } catch {
      // Ignore storage errors
    }
    setUser(DEMO_USERS.PENAKSIR);
  };

  return (
    <AuthContext.Provider value={{ user, setRole, setActiveUser, loginWithUsername, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
