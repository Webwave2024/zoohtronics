import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";

async function getProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function updateProfile(userId, data) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function listAddresses(userId) {
  return prisma.userAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

async function createAddress(userId, data) {
  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.userAddress.create({ data: { ...data, userId } });
  }, { isolationLevel: "Serializable" });
}

async function updateAddress(userId, id, data) {
  return prisma.$transaction(async (tx) => {
    const address = await tx.userAddress.findFirst({ where: { id, userId } });
    if (!address) throw new AppError(404, "Address not found.");
    if (data.isDefault) {
      await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.userAddress.update({ where: { id }, data });
  }, { isolationLevel: "Serializable" });
}

async function deleteAddress(userId, id) {
  const result = await prisma.userAddress.deleteMany({ where: { id, userId } });
  if (!result.count) throw new AppError(404, "Address not found.");
  return { deleted: true };
}

export { getProfile, updateProfile, listAddresses, createAddress, updateAddress, deleteAddress };
