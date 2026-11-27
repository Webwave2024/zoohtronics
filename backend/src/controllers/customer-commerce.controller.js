import * as commerceService from "../services/customer-commerce.service.js";
import * as couponService from "../services/coupon.service.js";

async function getWishlist(req, res) {
  return res.json({ wishlist: await commerceService.getWishlist(req.user.id) });
}

async function addWishlistItem(req, res) {
  const item = await commerceService.addWishlistItem(
    req.user.id,
    req.validated.body.laptopId,
  );
  return res.status(201).json({ item });
}

async function removeWishlistItem(req, res) {
  return res.json(await commerceService.removeWishlistItem(
    req.user.id,
    req.validated.params.laptopId,
  ));
}

async function listReviews(req, res) {
  return res.json(await commerceService.listReviews(
    req.validated.params.laptopId,
    req.validated.query,
  ));
}

async function createReview(req, res) {
  const review = await commerceService.createReview(
    req.user.id,
    req.validated.params.laptopId,
    req.validated.body,
  );
  return res.status(201).json({ review });
}

async function previewCoupon(req, res) {
  const result = await couponService.previewCoupon(
    req.user.id,
    req.validated.body.code,
  );
  return res.json({ coupon: result });
}

async function listPendingReviews(req, res) {
  return res.json(await commerceService.listPendingReviews(req.validated.query));
}

async function moderateReview(req, res) {
  const review = await commerceService.moderateReview(
    req.validated.params.id,
    req.validated.body.status,
  );
  return res.json({ review });
}

async function listAdminCoupons(req, res) {
  const result = await couponService.listCoupons(req.validated.query);
  return res.json({ coupons: result.items, pagination: result.pagination });
}

async function createAdminCoupon(req, res) {
  const coupon = await couponService.createCoupon(req.validated.body);
  return res.status(201).json({ coupon });
}

async function updateAdminCoupon(req, res) {
  const coupon = await couponService.updateCoupon(
    req.validated.params.id,
    req.validated.body,
  );
  return res.json({ coupon });
}

async function deactivateAdminCoupon(req, res) {
  const coupon = await couponService.deactivateCoupon(req.validated.params.id);
  return res.json({ coupon });
}

export {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  listReviews,
  createReview,
  previewCoupon,
  listPendingReviews,
  moderateReview,
  listAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deactivateAdminCoupon,
};
