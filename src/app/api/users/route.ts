import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const ALLOWED_ROLES = ["PENAKSIR", "PEMUTUS", "BACK_OFFICE", "ADMIN_IT"];

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        branch: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Gagal mengambil daftar user:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil daftar user." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, name, role, branch, password, actor } = body;

    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanName = String(name || "").trim();
    const cleanBranch = String(branch || "Kantor Pusat Ponorogo").trim();
    const rawPassword = String(password || "syariah2026");

    if (!cleanUsername || !cleanName || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Username, nama lengkap, dan role valid wajib diisi." },
        { status: 400 }
      );
    }

    if (rawPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Kata sandi awal minimal 6 karakter." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Username "@${cleanUsername}" sudah terdaftar.` },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (db) => {
      const newUser = await db.user.create({
        data: {
          username: cleanUsername,
          name: cleanName,
          passwordHash: hashPassword(rawPassword),
          role,
          branch: cleanBranch,
          active: true,
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          branch: true,
          active: true,
          updatedAt: true,
        },
      });

      await db.auditLog.create({
        data: {
          user: actor || "Admin IT",
          role: "ADMIN_IT",
          action: "Tambah User RBAC",
          notes: `Menambahkan akun petugas ${cleanName} (@${cleanUsername}) dengan peran ${role} di ${cleanBranch}.`,
        },
      });

      return newUser;
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("Gagal menambah user:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server saat menambah user." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, active, role, branch, name, newPassword, actor } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID user wajib disertakan." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "User tidak ditemukan." },
        { status: 404 }
      );
    }

    if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Role tidak valid." },
        { status: 400 }
      );
    }

    if (newPassword !== undefined && String(newPassword).length < 6) {
      return NextResponse.json(
        { success: false, error: "Kata sandi baru minimal 6 karakter." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (db) => {
      const updatedUser = await db.user.update({
        where: { id },
        data: {
          active: typeof active === "boolean" ? active : existing.active,
          role: role ?? existing.role,
          branch: branch ?? existing.branch,
          name: name ?? existing.name,
          passwordHash: newPassword ? hashPassword(String(newPassword)) : existing.passwordHash,
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          branch: true,
          active: true,
          updatedAt: true,
        },
      });

      await db.auditLog.create({
        data: {
          user: actor || "Admin IT",
          role: "ADMIN_IT",
          action: newPassword ? "Reset Password User" : "Update User RBAC",
          notes: newPassword
            ? `Admin IT mereset kata sandi akun ${updatedUser.name} (@${updatedUser.username}).`
            : `Memperbarui akses ${updatedUser.name} (@${updatedUser.username}): status=${updatedUser.active ? "Aktif" : "Nonaktif"}, role=${updatedUser.role}.`,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Gagal memperbarui user:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server saat memperbarui user." },
      { status: 500 }
    );
  }
}
