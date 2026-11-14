import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ProjectStagesService } from './project-stages.service.js'

export type ProjectStagesController = {
  getSummary: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getGeotechnical: (req: Request, res: Response, next: NextFunction) => Promise<void>
  upsertGeotechnical: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getDesign: (req: Request, res: Response, next: NextFunction) => Promise<void>
  upsertDesign: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getLicensing: (req: Request, res: Response, next: NextFunction) => Promise<void>
  upsertLicensing: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getMaterials: (req: Request, res: Response, next: NextFunction) => Promise<void>
  upsertMaterials: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getMaintenance: (req: Request, res: Response, next: NextFunction) => Promise<void>
  upsertMaintenance: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createProjectStagesController(
  service: ProjectStagesService,
): ProjectStagesController {
  return {
    async getSummary(req, res, next) {
      try {
        const data = await service.getSummary(String(req.params.projectId), parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async getGeotechnical(req, res, next) {
      try {
        const data = await service.getGeotechnical(
          String(req.params.projectId),
          parseAuthActor(req),
        )
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async upsertGeotechnical(req, res, next) {
      try {
        const data = await service.upsertGeotechnical(
          String(req.params.projectId),
          req.body,
          parseAuthActor(req),
        )
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async getDesign(req, res, next) {
      try {
        const data = await service.getDesign(String(req.params.projectId), parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async upsertDesign(req, res, next) {
      try {
        const data = await service.upsertDesign(
          String(req.params.projectId),
          req.body,
          parseAuthActor(req),
        )
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async getLicensing(req, res, next) {
      try {
        const data = await service.getLicensing(String(req.params.projectId), parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async upsertLicensing(req, res, next) {
      try {
        const data = await service.upsertLicensing(
          String(req.params.projectId),
          req.body,
          parseAuthActor(req),
        )
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async getMaterials(req, res, next) {
      try {
        const data = await service.getMaterials(String(req.params.projectId), parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async upsertMaterials(req, res, next) {
      try {
        const data = await service.upsertMaterials(
          String(req.params.projectId),
          req.body,
          parseAuthActor(req),
        )
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async getMaintenance(req, res, next) {
      try {
        const data = await service.getMaintenance(String(req.params.projectId), parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async upsertMaintenance(req, res, next) {
      try {
        const data = await service.upsertMaintenance(
          String(req.params.projectId),
          req.body,
          parseAuthActor(req),
        )
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
  }
}
