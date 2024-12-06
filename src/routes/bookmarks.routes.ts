import { Router } from 'express'
import {
  bookmarksTweetController,
  getAllBookmarkComtroller,
  unBookmarksTweetController,
  unBookmarksTweetIdController
} from '~/controllers/bookmarks.controller'
import { tweetidValidator } from '~/middlewares/tweets.middleware'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middleware'
import { wrapRequestHandler } from '~/utils/handlers'

export const bookmarksRouter = Router()
bookmarksRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  tweetidValidator,
  wrapRequestHandler(bookmarksTweetController)
)
bookmarksRouter.delete(
  '/tweets/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetidValidator,
  wrapRequestHandler(unBookmarksTweetController)
)
bookmarksRouter.delete(
  '/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetidValidator,
  wrapRequestHandler(unBookmarksTweetIdController)
)
bookmarksRouter.get('/', accessTokenValidator, verifiedUserValidator, wrapRequestHandler(getAllBookmarkComtroller))
