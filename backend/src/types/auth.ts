import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

export type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void; 