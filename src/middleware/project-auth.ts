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
      // In a real implementation, we'd validate the API key against the project
      // For now, we'll just use it as the project ID
      const project = await projectManager.getProject(apiKey)

      if (!project) {
        return res.status(401).json({ error: 'Invalid API key' })
      }

      req.projectId = project.id
      next()
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' })
    }
  }
}
