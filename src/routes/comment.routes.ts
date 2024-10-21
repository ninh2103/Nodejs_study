import { Router } from 'express'
import { commentTweetController, getCommentTweetController } from '~/controllers/comments.controller'
import { likesTweetController, unLikesTweetController } from '~/controllers/likes.controller'
import { paginateValidator, tweetidValidator } from '~/middlewares/tweets.middleware'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middleware'
import { wrapRequestHandler } from '~/utils/handlers'
export const commentRouter = Router()
commentRouter.post('/', accessTokenValidator, verifiedUserValidator, wrapRequestHandler(commentTweetController))
commentRouter.delete(
  '/tweets/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(unLikesTweetController)
)
commentRouter.get('/:tweet_id', paginateValidator, wrapRequestHandler(getCommentTweetController))
