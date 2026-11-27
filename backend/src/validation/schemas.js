import { z } from "zod";

const id = z.string().min(1);
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
const paramsWithId = z.object({ id });
const paramsWithItemId = z.object({ itemId: id });
const paramsWithPaymentId = z.object({ paymentId: id });
const paramsWithOrderId = z.object({ orderId: id });
const paramsWithShipmentId = z.object({ shipmentId: id });
const emptyBody = z.object({});
const paginatedRequest = z.object({
  body: emptyBody,
  params: z.object({}),
  query: pageQuery,
});
const idRequest = z.object({
  body: emptyBody,
  params: paramsWithId,
  query: z.object({}),
});

const registerBody = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    { message: "Password must be at most 72 bytes." },
  ),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).optional(),
});

const loginBody = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    { message: "Password must be at most 72 bytes." },
  ),
});
const passwordChangeBody = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(8).max(72).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    { message: "Password must be at most 72 bytes." },
  ),
});
const profileUpdateBody = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
}).refine((body) => Object.keys(body).length > 0, {
  message: "At least one profile field is required.",
});

const categoryBody = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).optional(),
});
const categoryRequest = z.object({
  body: categoryBody,
  params: z.object({}),
  query: z.object({}),
});
const categoryUpdateRequest = z.object({
  body: categoryBody.partial().refine((body) => Object.keys(body).length > 0, {
    message: "At least one category field is required.",
  }),
  params: paramsWithId,
  query: z.object({}),
});

const laptopFields = z.object({
  sku: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().min(1),
  brand: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(150),
  releaseYear: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().int().min(1970).max(2100).nullable().optional(),
  ),
  processor: z.string().trim().min(1).max(150),
  processorGeneration: z.string().max(100).nullable().optional(),
  ramGB: z.coerce.number().int().positive(),
  ramType: z.enum(["DDR3", "DDR4", "DDR5", "LPDDR4", "LPDDR5"]).nullable().optional(),
  storageGB: z.coerce.number().int().positive(),
  storageType: z.enum(["SSD", "HDD", "NVME", "HYBRID"]),
  graphics: z.string().max(150).nullable().optional(),
  displaySizeInches: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().positive().max(100).nullable().optional(),
  ),
  resolution: z.string().max(50).nullable().optional(),
  displayType: z.string().max(100).nullable().optional(),
  touchscreen: z.boolean().optional(),
  operatingSystem: z.string().max(100).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  batteryHealthPct: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().int().min(0).max(100).nullable().optional(),
  ),
  refurbishmentGrade: z.enum(["LIKE_NEW", "EXCELLENT", "GOOD", "FAIR"]),
  conditionNotes: z.string().max(5000).nullable().optional(),
  warrantyMonths: z.coerce.number().int().min(0).max(120).optional(),
  price: z.coerce.number().positive().max(99999999.99),
  compareAtPrice: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || Number(val) <= 0 ? null : Number(val)),
    z.number().positive().nullable().optional(),
  ),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
  stockQuantity: z.coerce.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"]).optional(),
  featured: z.boolean().optional(),
  categoryIds: z.array(id).optional(),
  images: z.array(z.object({
    url: z.string().url().max(2048),
    altText: z.string().max(300).optional(),
  })).max(20).optional(),
});

const addressBody = z.object({
  label: z.string().trim().max(100).optional(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(30),
  addressLine1: z.string().trim().min(1).max(250),
  addressLine2: z.string().trim().max(250).nullable().optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  countryCode: z.string().length(2).transform((value) => value.toUpperCase()),
  isDefault: z.boolean().optional(),
});
const addressRequest = z.object({
  body: addressBody,
  params: z.object({}),
  query: z.object({}),
});
const addressUpdateRequest = z.object({
  body: addressBody.partial().refine((body) => Object.keys(body).length > 0, {
    message: "At least one address field is required.",
  }),
  params: paramsWithId,
  query: z.object({}),
});

export {
  id,
  pageQuery,
  paramsWithId,
  paramsWithItemId,
  paramsWithPaymentId,
  paramsWithOrderId,
  paramsWithShipmentId,
  emptyBody,
  paginatedRequest,
  idRequest,
  registerBody,
  loginBody,
  passwordChangeBody,
  profileUpdateBody,
  categoryBody,
  categoryRequest,
  categoryUpdateRequest,
  laptopFields,
  addressBody,
  addressRequest,
  addressUpdateRequest,
};
