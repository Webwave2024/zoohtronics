import * as accountService from "../services/account.service.js";
import * as authService from "../services/auth.service.js";

async function getProfile(req, res) {
  return res.json({ user: await accountService.getProfile(req.user.id) });
}

async function updateProfile(req, res) {
  return res.json({
    user: await accountService.updateProfile(req.user.id, req.validated.body),
  });
}

async function changePassword(req, res) {
  return res.json(await authService.changePassword(req.user.id, req.validated.body));
}
async function listAddresses(req, res) {
  return res.json({ addresses: await accountService.listAddresses(req.user.id) });
}

async function createAddress(req, res) {
  const address = await accountService.createAddress(req.user.id, req.validated.body);
  return res.status(201).json({ address });
}

async function updateAddress(req, res) {
  const address = await accountService.updateAddress(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  return res.json({ address });
}

async function deleteAddress(req, res) {
  return res.json(await accountService.deleteAddress(req.user.id, req.validated.params.id));
}

export {
  getProfile,
  updateProfile,
  changePassword,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
