import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { BookmarkReqBody } from '~/models/requests/Bookmark.requests'
import { TokenPayload } from '~/models/requests/User.requests'
import { TweetReqBody } from '~/models/requests/tweet.requests'
import bookmarksService from '~/services/bookmarks.services'
import tweetsService from '~/services/tweets.services'

export const bookmarksTweetController = async (
  req: Request<ParamsDictionary, any, BookmarkReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await bookmarksService.bookmarkTweet(user_id, req.body.tweet_id)
  return res.json({
    message: ' BookmarkTweet Successfully',
    result
  })
}
export const unBookmarksTweetController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  await bookmarksService.unBookmarkTweet(user_id, req.params.tweet_id)
  return res.json({
    message: ' UnBookmarkTweet Successfully'
  })
}
export const unBookmarksTweetIdController = async (req: Request, res: Response, next: NextFunction) => {
  await bookmarksService.unBookmarkId(req.params.bookmarks_id)
  return res.json({
    message: ' UnBookmarkTweetId Successfully'
  })
}
