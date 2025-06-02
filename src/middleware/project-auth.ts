import { Request, Response, NextFunction } from 'express'
import { ProjectManager } from '../core/project-manager'

export interface AuthenticatedRequest extends Request {
  projectId?: string
}

export const projectAuth = (projectManager: ProjectManager) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const apiKey = req.headers['x-api-key']

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({ error: 'API key required' })
    }

    try {
      const project = await projectManager.getProjectByApiKey(apiKey)

      if (!project) {
        return res.status(401).json({ error: 'Invalid API key or project not found' })
      }

      req.projectId = project.id
      next()
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' })
    }
  }
}
