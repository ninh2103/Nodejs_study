import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { CommentReqBody } from '~/models/requests/Comment.requests'
import { LikeReqBody } from '~/models/requests/Like.request'
import { PaginationReq, TweetParam } from '~/models/requests/tweet.requests'
import { TokenPayload } from '~/models/requests/User.requests'
import commentsServices from '~/services/comments.services'
import likesService from '~/services/likes.services'

export const commentTweetController = async (
  req: Request<ParamsDictionary, any, CommentReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { content, tweet_id, parent_id } = req.body

  const result = await commentsServices.commentTweet(user_id, tweet_id, content, parent_id)

  return res.json({
    message: 'Comment Tweet Successfully',
    result
  })
}
export const getCommentTweetController = async (
  req: Request<ParamsDictionary, any, TweetParam, PaginationReq>,
  res: Response,
  next: NextFunction
) => {
  const { tweet_id } = req.params
  const page = Number(req.query.page)
  const limit = Number(req.query.limit)

  const result = await commentsServices.getCommentsWithUsers(tweet_id, limit, page)

  return res.json({
    message: ' get Comment Tweet Successfully',
    result
  })
}
