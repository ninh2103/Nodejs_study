import { Router } from 'express'
import {
  createTweetController,
  getNewFeedController,
  getTweetChildrenController,
  getTweetController,
  isUserLoggedInvalidator
} from '~/controllers/tweets.controller'
import {
  audienceValidator,
  creatTweetValidator,
  gettweetChilrenValidator,
  paginateValidator,
  tweetidValidator
} from '~/middlewares/tweets.middleware'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middleware'
import { wrapRequestHandler } from '~/utils/handlers'

const tweetRouter = Router()
tweetRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  creatTweetValidator,
  wrapRequestHandler(createTweetController)
)
tweetRouter.get(
  '/:tweet_id',
  tweetidValidator,
  isUserLoggedInvalidator(accessTokenValidator),
  isUserLoggedInvalidator(verifiedUserValidator),
  audienceValidator,
  wrapRequestHandler(getTweetController)
)
tweetRouter.get(
  '/:tweet_id/children',
  tweetidValidator,
  paginateValidator,
  gettweetChilrenValidator,
  isUserLoggedInvalidator(accessTokenValidator),
  isUserLoggedInvalidator(verifiedUserValidator),
  audienceValidator,
  wrapRequestHandler(getTweetChildrenController)
)
tweetRouter.get(
  '/',
  paginateValidator,
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getNewFeedController)
)
export default tweetRouter
