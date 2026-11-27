import * as adminService from "../services/admin.service.js";

async function listUsers(req, res) {
  return res.json(await adminService.listUsers(req.validated.query));
}

async function updateUser(req, res) {
  const user = await adminService.updateUser(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  return res.json({ user });
}

async function listProducts(req, res) {
  return res.json(await adminService.listProducts(req.validated.query));
}

async function getProduct(req, res) {
  const product = await adminService.getProduct(req.validated.params.id);
  return res.json({ product });
}

async function adjustInventory(req, res) {
  const result = await adminService.adjustInventory(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  return res.json(result);
}

async function listInventoryMovements(req, res) {
  const result = await adminService.listInventoryMovements(
    req.validated.params.id,
    req.validated.query,
  );
  return res.json(result);
}

async function getDashboard(req, res) {
  const result = await adminService.getDashboard(req.validated.query.lowStockThreshold);
  return res.json({ dashboard: result });
}

export {
  listUsers,
  updateUser,
  listProducts,
  getProduct,
  adjustInventory,
  listInventoryMovements,
  getDashboard,
};
