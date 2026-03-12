import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function createError(message: string, statusCode = 400): AppError {
  const e: AppError = new Error(message);
  e.statusCode = statusCode;
  return e;
}

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(createError(`Not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = err.statusCode || 500;
  if (status >= 500) console.error('[ERROR]', err);
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: err.stack }),
  });
}
