import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";

async function createInquiry(data) {
  const { website, ...inquiry } = data;
  if (website) throw new AppError(400, "Unable to submit this inquiry.");

  return prisma.supportInquiry.create({
    data: {
      ...inquiry,
      email: inquiry.email.toLowerCase(),
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  });
}

async function listInquiries(query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            { subject: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.supportInquiry.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        status: true,
        assignedAdminId: true,
        assignedAdmin: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supportInquiry.count({ where }),
  ]);
  return { items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } };
}

async function getInquiry(id) {
  const inquiry = await prisma.supportInquiry.findUnique({
    where: { id },
    include: {
      assignedAdmin: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
  if (!inquiry) throw new AppError(404, "Inquiry not found.");
  return inquiry;
}

async function updateInquiry(id, data) {
  if (data.assignedAdminId) {
    const admin = await prisma.user.findFirst({
      where: { id: data.assignedAdminId, role: "ADMIN", status: "ACTIVE" },
      select: { id: true },
    });
    if (!admin) throw new AppError(400, "Assigned user must be an active administrator.");
  }

  const updated = await prisma.supportInquiry.updateMany({
    where: { id },
    data,
  });
  if (!updated.count) throw new AppError(404, "Inquiry not found.");
  return getInquiry(id);
}

export { createInquiry, listInquiries, getInquiry, updateInquiry };
