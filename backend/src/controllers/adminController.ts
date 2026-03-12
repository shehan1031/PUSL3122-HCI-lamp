import { Request, Response, NextFunction } from 'express';
import Design from '../models/Design.js';
import User from '../models/User.js';
import { createError } from '../middleware/errorHandler.js';

// GET /api/admin/stats
export async function getStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const [totalUsers, totalDesigns, activeDesigns, draftDesigns, archivedDesigns,
           furItems, recentDesigns, topDesigners, monthlyData, roomTypes] = await Promise.all([
      User.countDocuments(),
      Design.countDocuments(),
      Design.countDocuments({ status: 'active' }),
      Design.countDocuments({ status: 'draft' }),
      Design.countDocuments({ status: 'archived' }),
      Design.aggregate([{ $project: { c: { $size: '$furniture' } } }, { $group: { _id: null, t: { $sum: '$c' } } }]),
      Design.find().sort({ createdAt: -1 }).limit(5).lean(),
      User.find({ role: 'designer' }).sort({ designCount: -1 }).limit(5).select('-password').lean(),
      Design.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { m: { $month: '$createdAt' }, y: { $year: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      Design.aggregate([{ $group: { _id: '$roomType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers, totalDesigns, activeDesigns, draftDesigns, archivedDesigns,
        totalFurnitureItems: furItems[0]?.t || 0,
        recentDesigns, topDesigners, monthlyData, roomTypes,
      },
    });
  } catch (e) { next(e); }
}

// GET /api/admin/users
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search = '' } = req.query as Record<string, string>;
    const q = search ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};
    const [users, total] = await Promise.all([
      User.find(q).select('-password').sort({ createdAt: -1 }).limit(50).lean(),
      User.countDocuments(q),
    ]);
    res.json({ success: true, data: { users, total } });
  } catch (e) { next(e); }
}

// PATCH /api/admin/users/:id
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const update: Record<string, unknown> = {};
    for (const k of ['name', 'isActive', 'role']) if (k in req.body) update[k] = req.body[k];
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (e) { next(e); }
}

// DELETE /api/admin/users/:id
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.userId === req.params.id) throw createError('Cannot delete yourself');
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
}

// GET /api/admin/designs
export async function getAllDesigns(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query as Record<string, string>;
    const q = status ? { status } : {};
    const [designs, total] = await Promise.all([
      Design.find(q).sort({ updatedAt: -1 }).limit(50).lean(),
      Design.countDocuments(q),
    ]);
    res.json({ success: true, data: { designs, total } });
  } catch (e) { next(e); }
}
