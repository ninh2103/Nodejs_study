import { Router } from 'express'
import { getConversationsController } from '~/controllers/conversations.controller'
import { paginateValidator } from '~/middlewares/tweets.middleware'
import { accessTokenValidator, getConversationsValidator, verifiedUserValidator } from '~/middlewares/users.middleware'
import { wrapRequestHandler } from '~/utils/handlers'

export const conversationsRouter = Router()
conversationsRouter.get(
  '/receiver/:receiver_id',
  accessTokenValidator,
  verifiedUserValidator,
  paginateValidator,
  getConversationsValidator,
  wrapRequestHandler(getConversationsController)
)
