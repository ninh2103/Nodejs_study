import { TweetAudience, TweetType } from '~/constants/enums'
import { Media } from '../Others'
import { ParamsDictionary, Query } from 'express-serve-static-core'

export interface TweetReqBody {
  type: TweetType
  audience: TweetAudience
  content: string
  parent_id: null | string
  hashtags: string[]
  mentions: string[]
  medias: Media[]
}
export interface TweetParam extends ParamsDictionary {
  tweet_id: string
}

export interface TweetQuery extends PaginationReq, Query {
  tweet_type: string
}
export interface PaginationReq {
  limit: string
  page: string
}
