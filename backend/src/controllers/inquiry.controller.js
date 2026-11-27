import * as inquiryService from "../services/inquiry.service.js";

async function createInquiry(req, res) {
  const inquiry = await inquiryService.createInquiry(req.validated.body);
  return res.status(201).json({
    inquiry,
    message: "Your inquiry was received.",
  });
}

async function listInquiries(req, res) {
  return res.json(await inquiryService.listInquiries(req.validated.query));
}

async function getInquiry(req, res) {
  const inquiry = await inquiryService.getInquiry(req.validated.params.id);
  return res.json({ inquiry });
}

async function updateInquiry(req, res) {
  const inquiry = await inquiryService.updateInquiry(
    req.validated.params.id,
    req.validated.body,
  );
  return res.json({ inquiry });
}

export { createInquiry, listInquiries, getInquiry, updateInquiry };
