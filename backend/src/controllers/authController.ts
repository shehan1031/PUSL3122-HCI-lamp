import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import { signToken, JWTPayload } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw createError('Email and password are required');

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) throw createError('Invalid credentials', 401);
    if (!(await user.comparePassword(password))) throw createError('Invalid credentials', 401);

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const payload: JWTPayload = { userId: user._id.toString(), email: user.email, role: user.role, name: user.name };
    const token = signToken(payload);

    res.cookie('lamp_token', token, COOKIE);
    res.status(200).json({ success: true, data: { user: user.toJSON(), token } });
  } catch (e) { next(e); }
}

// POST /api/auth/register
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) throw createError('Name, email and password are required');
    if (await User.findOne({ email: email.toLowerCase().trim() })) throw createError('Email already registered');

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role === 'admin' ? 'admin' : 'designer',
    });

    const payload: JWTPayload = { userId: user._id.toString(), email: user.email, role: user.role, name: user.name };
    const token = signToken(payload);

    res.cookie('lamp_token', token, COOKIE);
    res.status(201).json({ success: true, data: { user: user.toJSON(), token } });
  } catch (e) { next(e); }
}

// POST /api/auth/logout
export function logout(_req: Request, res: Response) {
  res.clearCookie('lamp_token');
  res.status(200).json({ success: true, data: { message: 'Logged out' } });
}

// GET /api/auth/me
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user!.userId).select('-password');
    if (!user) throw createError('User not found', 404);
    res.status(200).json({ success: true, data: user });
  } catch (e) { next(e); }
}
