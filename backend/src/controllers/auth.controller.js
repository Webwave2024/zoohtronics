import * as authService from "../services/auth.service.js";

async function register(req, res) {
  const result = await authService.register(req.validated.body);
  return res.status(201).json(result);
}

async function login(req, res) {
  const result = await authService.login(req.validated.body);
  return res.json(result);
}

async function me(req, res) {
  return res.json({ user: req.user });
}

export { register, login, me };
