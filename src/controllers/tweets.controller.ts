import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { TweetType } from '~/constants/enums'
import { TokenPayload } from '~/models/requests/User.requests'
import { PaginationReq, TweetParam, TweetQuery, TweetReqBody } from '~/models/requests/tweet.requests'
import tweetsService from '~/services/tweets.services'

export const createTweetController = async (
  req: Request<ParamsDictionary, any, TweetReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await tweetsService.createTweet(user_id, req.body)
  return res.json({
    message: 'Create tweet Successfully',
    result
  })
}
export const getTweetController = async (req: Request, res: Response, next: NextFunction) => {
  const result = await tweetsService.increaseView(req.params.tweet_id, req.decoded_authorization?.user_id)
  const tweet = {
    ...req.tweet,
    guest_view: result.guest_view,
    user_view: result.user_view,
    view: result.guest_view + result.user_view
  }
  return res.json({
    message: 'get tweet Successfully',
    result: tweet
  })
}
export const getTweetChildrenController = async (
  req: Request<TweetParam, any, any, TweetQuery>,
  res: Response,
  next: NextFunction
) => {
  const tweet_type = Number(req.query.tweet_type) as TweetType
  const page = Number(req.query.page)
  const limit = Number(req.query.limit)
  const user_id = req.decoded_authorization?.user_id
  const { tweets, total } = await tweetsService.getTweetChildren({
    tweet_id: req.params.tweet_id,
    tweet_type,
    limit,
    page,
    user_id
  })
  return res.json({
    message: 'get tweet children Successfully',
    result: tweets,
    tweet_type,
    limit,
    page,
    total_page: Math.ceil(total / limit)
  })
}
export const isUserLoggedInvalidator = (middleware: (req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      return middleware(req, res, next)
    }
    next()
  }
}
export const getNewFeedController = async (
  req: Request<ParamsDictionary, any, any, PaginationReq>,
  res: Response,
  next: NextFunction
) => {
  const user_id = req.decoded_authorization?.user_id as string
  const page = Number(req.query.page)
  const limit = Number(req.query.limit)
  const result = await tweetsService.getNewfeeds({ user_id, page, limit })

  res.json({
    message: 'get new feed success',
    result: result
  })
}
