import { Router, Request, Response } from 'express';
import {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from '../services/projectService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

type RequestWithUser = Request & { user: { userId: string } };

function hasUser(req: Request): req is RequestWithUser {
  return typeof (req as RequestWithUser).user?.userId === 'string';
}

// All project routes require authentication
router.use(authMiddleware);

/**
 * GET /api/projects - Get all projects for authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const projects = await getUserProjects(userId);
    res.json({ projects });
  } catch (error) {
    console.error('[Project API] Get projects error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get projects',
    });
  }
});

/**
 * GET /api/projects/:id - Get a specific project
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const project = await getProjectById(id, userId);
    res.json({ project });
  } catch (error) {
    console.error('[Project API] Get project error:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Project not found',
    });
  }
});

/**
 * POST /api/projects - Create a new project
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, color } = req.body;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    if (!name) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }

    const project = await createProject({
      name,
      description,
      color,
      userId,
    });

    res.status(201).json({
      message: 'Project created successfully',
      project,
    });
  } catch (error) {
    console.error('[Project API] Create project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create project',
    });
  }
});

/**
 * PATCH /api/projects/:id - Update a project
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const { name, description, color, isExpanded } = req.body;

    const project = await updateProject(id, userId, {
      name,
      description,
      color,
      isExpanded,
    });

    res.json({
      message: 'Project updated successfully',
      project,
    });
  } catch (error) {
    console.error('[Project API] Update project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update project',
    });
  }
});

/**
 * DELETE /api/projects/:id - Delete a project
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    const result = await deleteProject(id, userId);

    res.json(result);
  } catch (error) {
    console.error('[Project API] Delete project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete project',
    });
  }
});

export default router;
