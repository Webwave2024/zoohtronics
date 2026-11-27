import * as catalogService from "../services/catalog.service.js";

async function listProducts(req, res) {
  return res.json(await catalogService.listProducts(req.validated.query));
}

async function getBestSellers(req, res) {
  return res.json(await catalogService.getBestSellers({
    all: req.validated.query.all === "true",
  }));
}

async function getTrendingProducts(req, res) {
  return res.json(await catalogService.getTrendingProducts({
    all: req.validated.query.all === "true",
  }));
}

async function listAdminProducts(req, res) {
  return res.json(await catalogService.listProducts(req.validated.query, true));
}

async function getProduct(req, res) {
  return res.json({ product: await catalogService.getProduct(req.validated.params.id) });
}

async function getAdminProduct(req, res) {
  return res.json({ product: await catalogService.getProduct(req.validated.params.id, true) });
}

async function createAdminProduct(req, res) {
  const product = await catalogService.createProduct(req.validated.body, req.user.id);
  return res.status(201).json({ product });
}

async function listCategories(req, res) {
  return res.json({ categories: await catalogService.listCategories() });
}

async function getSuggestions(req, res) {
  const suggestions = await catalogService.getSuggestions(req.validated.query.q);
  return res.json({ suggestions });
}

async function getFilterOptions(req, res) {
  return res.json({ filters: await catalogService.getFilterOptions() });
}

async function createCategory(req, res) {
  const category = await catalogService.createCategory(req.validated.body);
  return res.status(201).json({ category });
}

async function updateCategory(req, res) {
  const category = await catalogService.updateCategory(
    req.validated.params.id,
    req.validated.body,
  );
  return res.json({ category });
}

async function deleteCategory(req, res) {
  return res.json(await catalogService.deleteCategory(req.validated.params.id));
}

async function createProduct(req, res) {
  const product = await catalogService.createProduct(req.validated.body, req.user.id);
  return res.status(201).json({ product });
}

async function updateProduct(req, res) {
  const product = await catalogService.updateProduct(
    req.validated.params.id,
    req.validated.body,
  );
  return res.json({ product });
}

async function deleteProduct(req, res) {
  return res.json(await catalogService.deleteProduct(req.validated.params.id));
}

export {
  listProducts,
  getBestSellers,
  getTrendingProducts,
  listAdminProducts,
  getProduct,
  getAdminProduct,
  createAdminProduct,
  listCategories,
  getSuggestions,
  getFilterOptions,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
};
