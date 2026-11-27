import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";
import { getJwtSecret } from "../middleware/authenticate.js";

function createToken(user) {
  return jwt.sign(
    { sub: user.id, ver: user.tokenVersion },
    getJwtSecret(),
    { expiresIn: "7d", algorithm: "HS256" },
  );
}

async function register(data) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email.trim().toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      tokenVersion: true,
      createdAt: true,
    },
  });

  const { tokenVersion, ...publicUser } = user;
  return { user: publicUser, token: createToken(user) };
}

async function login({ email, password }) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (
    !userWithPassword ||
    userWithPassword.status !== "ACTIVE" ||
    !(await bcrypt.compare(password, userWithPassword.passwordHash))
  ) {
    throw new AppError(401, "Email or password is incorrect.");
  }

  const { passwordHash, tokenVersion, ...user } = userWithPassword;
  return {
    user,
    token: createToken({ ...user, tokenVersion }),
  };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new AppError(404, "User not found.");
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(400, "Current password is incorrect.");
  }
  if (currentPassword === newPassword) {
    throw new AppError(400, "New password must differ from the current password.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  return { message: "Password updated. Sign in again on your other devices." };
}

export { register, login, changePassword };
