import { Router } from 'express'
import { likesTweetController, unLikesTweetController } from '~/controllers/likes.controller'
import { tweetidValidator } from '~/middlewares/tweets.middleware'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middleware'
import { wrapRequestHandler } from '~/utils/handlers'
export const likesRouter = Router()
likesRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  //tweetidValidator,
  wrapRequestHandler(likesTweetController)
)
likesRouter.delete(
  '/tweets/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  //tweetidValidator,
  wrapRequestHandler(unLikesTweetController)
)
