import { Request, Response, NextFunction } from 'express';

import { UserModel, TokenBlacklistModel } from '../models/auth.js';
import { JwtUtils } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    roleId: string;
  };
}

export class AuthMiddleware {
  static async authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authorization token required' });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Check if token is blacklisted
      const isBlacklisted = await TokenBlacklistModel.isBlacklisted(token);
      if (isBlacklisted) {
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }

      // Verify token
      const decoded = JwtUtils.verifyAccessToken(token);

      // Check if token is access token
      if (decoded.type !== 'access') {
        res.status(401).json({ error: 'Invalid token type' });
        return;
      }

      // Get user from database
      const user = await UserModel.findById(decoded.sub);
      if (!user || !user.isActive) {
        res.status(401).json({ error: 'User not found or inactive' });
        return;
      }

      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        roleId: user.roleId,
      };

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  static async authorize(permission: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const user = await UserModel.findById(req.user.id);
        if (!user) {
          res.status(401).json({ error: 'User not found' });
          return;
        }

        // Check if user has the required permission
        const hasPermission = user.role?.permissions.some((p) => p.name === permission);
        if (!hasPermission) {
          res.status(403).json({ error: 'Insufficient permissions' });
          return;
        }

        next();
      } catch (error) {
        res.status(500).json({ error: 'Authorization check failed' });
      }
    };
  }

  static requireRole(roleName: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const user = await UserModel.findById(req.user.id);
        if (!user) {
          res.status(401).json({ error: 'User not found' });
          return;
        }

        if (user.role?.name !== roleName) {
          res.status(403).json({ error: 'Insufficient role permissions' });
          return;
        }

        next();
      } catch (error) {
        res.status(500).json({ error: 'Role authorization check failed' });
      }
    };
  }

  static requireAnyRole(roles: string[]) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const user = await UserModel.findById(req.user.id);
        if (!user) {
          res.status(401).json({ error: 'User not found' });
          return;
        }

        if (!user.role || !roles.includes(user.role.name)) {
          res.status(403).json({ error: 'Insufficient role permissions' });
          return;
        }

        next();
      } catch (error) {
        res.status(500).json({ error: 'Role authorization check failed' });
      }
    };
  }

  static optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    JwtUtils.verifyAccessToken(token)
      .then(async (decoded) => {
        if (decoded.type === 'access') {
          const user = await UserModel.findById(decoded.sub);
          if (user && user.isActive) {
            req.user = {
              id: user.id,
              email: user.email,
              username: user.username,
              roleId: user.roleId,
            };
          }
        }
        next();
      })
      .catch(() => {
        next();
      });
  }
}

export class ValidationMiddleware {
  static validateLogin(req: Request, res: Response, next: NextFunction): void {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (!this.isValidEmail(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    next();
  }

  static validateRegister(req: Request, res: Response, next: NextFunction): void {
    const { email, username, password, firstName, lastName } = req.body;

    if (!email || !username || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    if (!this.isValidEmail(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters long' });
      return;
    }

    if (firstName.length < 1 || lastName.length < 1) {
      res.status(400).json({ error: 'First name and last name are required' });
      return;
    }

    next();
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
