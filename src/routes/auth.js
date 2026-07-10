const express = require('express');
const router = express.Router();
const { signup, login } = require('../services/authService');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.post('/auth/signup', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const result = await signup(name, email, password);
  res.status(201).json(result);
}));

router.post('/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const result = await login(email, password);
  res.json(result);
}));

module.exports = router;
