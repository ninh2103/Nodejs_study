import { Router } from 'express'
import {
  createTweetController,
  deleteTweetController,
  getAllNewFeedController,
  getNewFeedController,
  getNewFeedMeController,
  getNewFeedUserController,
  getNewFeedVideoController,
  getRandomNewFeedController,
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
  //tweetidValidator,
  //verifiedUserValidator,
  isUserLoggedInvalidator(accessTokenValidator),
  isUserLoggedInvalidator(verifiedUserValidator),
  // audienceValidator,
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

tweetRouter.get('/newfeed/me', accessTokenValidator, verifiedUserValidator, wrapRequestHandler(getNewFeedMeController))
tweetRouter.get(
  '/newfeed/user/:profile_user_id',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getNewFeedUserController)
)
tweetRouter.get(
  '/newfeed/random',
  paginateValidator,
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getRandomNewFeedController)
)

tweetRouter.get(
  '/dashboard/list/',
  paginateValidator,
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getAllNewFeedController)
)
tweetRouter.delete('/:_id', accessTokenValidator, verifiedUserValidator, wrapRequestHandler(deleteTweetController))
export default tweetRouter
tweetRouter.get(
  '/video/newfeed/random',
  paginateValidator,
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getNewFeedVideoController)
)
