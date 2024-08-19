import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { LikeReqBody } from '~/models/requests/Like.request'
import { TokenPayload } from '~/models/requests/User.requests'
import likesService from '~/services/likes.services'

export const likesTweetController = async (
  req: Request<ParamsDictionary, any, LikeReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await likesService.likeTweet(user_id, req.body.tweet_id)
  return res.json({
    message: ' Like Tweet Successfully',
    result
  })
}
export const unLikesTweetController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  await likesService.unLikeTweet(user_id, req.params.tweet_id)
  return res.json({
    message: ' Unlike Tweet Successfully'
  })
}
