import type { NextFunction, Request, RequestHandler, Response } from 'express'

type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>

/** Express async route wrapper — forwards rejected promises to error middleware. */
export function wrap(handler: AsyncRouteHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next)
  }
}
