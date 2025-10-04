import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  getUserById,
  updateUserProfile,
} from '../services/authService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const result = await registerUser({ email, password, name });

    res.status(201).json({
      message: 'User registered successfully',
      ...result,
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ error: errorMessage });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await loginUser({ email, password });

    res.json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: errorMessage });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.userId);

    res.json({ user });
  } catch (error) {
    console.error('[Auth] Get profile error:', error);
    res.status(404).json({ error: 'User not found' });
  }
});

/**
 * PATCH /api/auth/profile
 * Update user profile
 */
router.patch('/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { name, avatar } = req.body;

    const user = await updateUserProfile(req.user.userId, { name, avatar });

    res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('[Auth] Update profile error:', error);
    res.status(400).json({ error: 'Failed to update profile' });
  }
});

export default router;
