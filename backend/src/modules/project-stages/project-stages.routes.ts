import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { ProjectStagesController } from './project-stages.controller.js'
import {
  batchStageSummariesBodySchema,
  projectIdParamsSchema,
  upsertDesignBodySchema,
  upsertGeotechnicalBodySchema,
  upsertLicensingBodySchema,
  upsertMaintenanceBodySchema,
  upsertMaterialsBodySchema,
} from './project-stages.schema.js'

export type ProjectStagesRouterDeps = {
  controller: ProjectStagesController
}

export function createProjectStagesRouter(deps: ProjectStagesRouterDeps): Router {
  const { controller } = deps
  const router = Router({ mergeParams: true })

  router.use(authenticate)

  router.post(
    '/stages/summaries',
    validate({ body: batchStageSummariesBodySchema }),
    controller.getSummaries,
  )

  router.get(
    '/:projectId/stages',
    validate({ params: projectIdParamsSchema }),
    controller.getSummary,
  )

  router.get(
    '/:projectId/stages/geotechnical',
    validate({ params: projectIdParamsSchema }),
    controller.getGeotechnical,
  )
  router.put(
    '/:projectId/stages/geotechnical',
    validate({ params: projectIdParamsSchema, body: upsertGeotechnicalBodySchema }),
    controller.upsertGeotechnical,
  )

  router.get(
    '/:projectId/stages/design',
    validate({ params: projectIdParamsSchema }),
    controller.getDesign,
  )
  router.put(
    '/:projectId/stages/design',
    validate({ params: projectIdParamsSchema, body: upsertDesignBodySchema }),
    controller.upsertDesign,
  )

  router.get(
    '/:projectId/stages/licensing',
    validate({ params: projectIdParamsSchema }),
    controller.getLicensing,
  )
  router.put(
    '/:projectId/stages/licensing',
    validate({ params: projectIdParamsSchema, body: upsertLicensingBodySchema }),
    controller.upsertLicensing,
  )

  router.get(
    '/:projectId/stages/materials',
    validate({ params: projectIdParamsSchema }),
    controller.getMaterials,
  )
  router.put(
    '/:projectId/stages/materials',
    validate({ params: projectIdParamsSchema, body: upsertMaterialsBodySchema }),
    controller.upsertMaterials,
  )

  router.get(
    '/:projectId/stages/maintenance',
    validate({ params: projectIdParamsSchema }),
    controller.getMaintenance,
  )
  router.put(
    '/:projectId/stages/maintenance',
    validate({ params: projectIdParamsSchema, body: upsertMaintenanceBodySchema }),
    controller.upsertMaintenance,
  )

  return router
}
