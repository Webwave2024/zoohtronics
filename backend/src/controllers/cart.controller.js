import * as cartService from "../services/cart.service.js";

async function getCart(req, res) {
  return res.json({ cart: await cartService.getCart(req.user.id) });
}

async function addItem(req, res) {
  const { laptopId, quantity } = req.validated.body;
  const item = await cartService.addItem(req.user.id, laptopId, quantity);
  return res.status(201).json({ item });
}

async function updateItem(req, res) {
  const item = await cartService.updateItem(
    req.user.id,
    req.validated.params.itemId,
    req.validated.body.quantity,
  );
  return res.json({ item });
}

async function removeItem(req, res) {
  return res.json(await cartService.removeItem(req.user.id, req.validated.params.itemId));
}

async function clearCart(req, res) {
  return res.json(await cartService.clearCart(req.user.id));
}

export { getCart, addItem, updateItem, removeItem, clearCart };
