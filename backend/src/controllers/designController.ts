import { Request, Response, NextFunction } from 'express';
import Design from '../models/Design.js';
import User from '../models/User.js';
import { createError } from '../middleware/errorHandler.js';

// GET /api/designs
export async function listDesigns(req: Request, res: Response, next: NextFunction) {
  try {
    const designs = await Design.find({ designerId: req.user!.userId }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: designs });
  } catch (e) { next(e); }
}

// POST /api/designs
export async function createDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, client, roomType, shape, roomWidth, roomLength, wallColor, status, furniture } = req.body;
    if (!name || !client) throw createError('Name and client are required');

    const design = await Design.create({
      name, client, roomType, shape, roomWidth, roomLength, wallColor,
      status: status || 'draft',
      designerId: req.user!.userId,
      designerName: req.user!.name,
      furniture: furniture || [],
    });

    await User.findByIdAndUpdate(req.user!.userId, { $inc: { designCount: 1 } });
    res.status(201).json({ success: true, data: design });
  } catch (e) { next(e); }
}

// GET /api/designs/:id
export async function getDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const design = await Design.findOne({ _id: req.params.id, designerId: req.user!.userId });
    if (!design) throw createError('Design not found', 404);
    design.views += 1;
    await design.save({ validateBeforeSave: false });
    res.json({ success: true, data: design });
  } catch (e) { next(e); }
}

// PATCH /api/designs/:id
export async function updateDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const allowed = ['name','client','roomType','shape','roomWidth','roomLength','wallColor','status','furniture'];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];

    const design = await Design.findOneAndUpdate(
      { _id: req.params.id, designerId: req.user!.userId },
      update,
      { new: true, runValidators: true }
    );
    if (!design) throw createError('Design not found', 404);
    res.json({ success: true, data: design });
  } catch (e) { next(e); }
}

// DELETE /api/designs/:id
export async function deleteDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const design = await Design.findOneAndDelete({ _id: req.params.id, designerId: req.user!.userId });
    if (!design) throw createError('Design not found', 404);
    await User.findByIdAndUpdate(req.user!.userId, { $inc: { designCount: -1 } });
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
}
