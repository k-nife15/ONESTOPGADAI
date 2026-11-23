import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      currentUsername,
      name,
      newUsername,
      currentPassword,
      newPassword,
    } = body;

    const cleanCurrent = String(currentUsername || "").trim().toLowerCase();
    if (!cleanCurrent) {
      return NextResponse.json(
        { success: false, error: "Identitas akun saat ini tidak ditemukan." },
        { status: 400 }
      );
    }

    let dbUser = await prisma.user.findUnique({
      where: { username: cleanCurrent },
    });

    if (!dbUser) {
      const demoIdMap: Record<string, string> = {
        "19940812.ahmad": "u-penaksir",
        "19780410.arifin": "u-pemutus",
        "19961120.rina": "u-backoffice",
        "19900215.slamet": "u-admin",
      };
      const fallbackId = demoIdMap[cleanCurrent];
      if (fallbackId) {
        dbUser = await prisma.user.findUnique({ where: { id: fallbackId } });
      }
    }

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "Akun pengguna tidak ditemukan di database." },
        { status: 404 }
      );
    }

    const nextUsername = newUsername
      ? String(newUsername).trim().toLowerCase()
      : dbUser.username;
    const nextName = name ? String(name).trim() : dbUser.name;

    if (!nextUsername || !nextName) {
      return NextResponse.json(
        { success: false, error: "Nama lengkap dan username tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (nextUsername !== dbUser.username) {
      const conflict = await prisma.user.findUnique({
        where: { username: nextUsername },
      });
      if (conflict) {
        return NextResponse.json(
          { success: false, error: `Username "@${nextUsername}" sudah digunakan oleh akun lain.` },
          { status: 400 }
        );
      }
    }

    let nextPasswordHash = dbUser.passwordHash;
    if (newPassword) {
      const curPass = String(currentPassword || "");
      const isCurValid = dbUser.passwordHash
        ? verifyPassword(curPass, dbUser.passwordHash)
        : curPass === "syariah2026";

      if (!isCurValid) {
        return NextResponse.json(
          { success: false, error: "Kata sandi saat ini tidak sesuai." },
          { status: 400 }
        );
      }
      if (String(newPassword).length < 6) {
        return NextResponse.json(
          { success: false, error: "Kata sandi baru minimal 6 karakter." },
          { status: 400 }
        );
      }
      nextPasswordHash = hashPassword(String(newPassword));
    }

    const updated = await prisma.$transaction(async (db) => {
      const updatedUser = await db.user.update({
        where: { id: dbUser.id },
        data: {
          username: nextUsername,
          name: nextName,
          passwordHash: nextPasswordHash,
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          branch: true,
          active: true,
        },
      });

      await db.auditLog.create({
        data: {
          user: updatedUser.name,
          role: updatedUser.role,
          action: "Ubah Profil & Kredensial",
          notes: `Pengguna @${dbUser.username} memperbarui profil${
            nextUsername !== dbUser.username ? ` (username baru: @${nextUsername})` : ""
          }${newPassword ? " dan kata sandi" : ""}.`,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Gagal memperbarui profil:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server saat menyimpan profil." },
      { status: 500 }
    );
  }
}
