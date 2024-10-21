import { error } from 'console'
import { NextFunction, Request, Response } from 'express'
import { checkSchema } from 'express-validator'
import { isEmpty, values } from 'lodash'
import { ObjectId } from 'mongodb'
import { MediaType, TweetAudience, TweetType, UserVerifyStatus } from '~/constants/enums'
import { HTTP_STATUS } from '~/constants/httpStatus'
import { TWEETMESSAGE, userMessage } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/errors'
import Tweets from '~/models/schemas/Tweets.schema'
import databaseService from '~/services/database.services'
import { numberEnumToArray } from '~/utils/commons'
import { wrapRequestHandler } from '~/utils/handlers'
import { validate } from '~/utils/validation'
const tweettype = numberEnumToArray(TweetType)
const tweetAudience = numberEnumToArray(TweetAudience)
const tweetMedia = numberEnumToArray(MediaType)

export const creatTweetValidator = validate(
  checkSchema({
    type: {
      isIn: {
        options: [tweettype],
        errorMessage: TWEETMESSAGE.INVALID_TYPE
      }
    },
    audience: {
      isIn: {
        options: [tweetAudience],
        errorMessage: TWEETMESSAGE.INVALID_AUDIENCE
      }
    },
    parent_id: {
      custom: {
        options: (value, { req }) => {
          const type = req.body.type as TweetType
          if ([TweetType.Retweet, TweetType.Comment, TweetType.QuoteTweet].includes(type) && !ObjectId.isValid(value)) {
            throw new Error(TWEETMESSAGE.PARENT_ID_MUST_BE_A_VALID_TWEET_ID)
          }
          if (TweetType.Tweet && value !== null) {
            throw new Error(TWEETMESSAGE.PARENT_ID_MUST_BE_NULL)
          }
          return true
        }
      }
    },
    content: {
      isString: true,
      custom: {
        options: (value, { req }) => {
          const type = req.body.type as TweetType
          const hashtags = req.body.hashtags as string[]
          const mentions = req.body.mentions as string[]

          if (
            [TweetType.Tweet, TweetType.Comment, TweetType.QuoteTweet].includes(type) &&
            isEmpty(mentions) &&
            isEmpty(hashtags) &&
            value === ''
          ) {
            throw new Error(TWEETMESSAGE.CONTENT_NOT_BE_MUST_EMTY_STRING)
          }
          if (type === TweetType.Retweet && value !== '') {
            throw new Error(TWEETMESSAGE.CONTENT_MUST_BE_EMTY_STRING)
          }
          return true
        }
      }
    },
    hashtags: {
      isArray: true,
      custom: {
        options: (value, { req }) => {
          if (!value.every((item: any) => typeof item === 'string')) {
            throw new Error(TWEETMESSAGE.HASHTAG_MUST_BE_AN_ARRAY_OF_STRING)
          }
          return true
        }
      }
    },
    mentions: {
      isArray: true,
      custom: {
        options: (value, { req }) => {
          if (!value.every((item: any) => ObjectId.isValid(item))) {
            throw new Error(TWEETMESSAGE.MENTIONS_MUST_BE_AN_ARRAY_OF_USER_ID)
          }
          return true
        }
      }
    },
    medias: {
      isArray: true,
      custom: {
        options: (value, { req }) => {
          if (
            value.some((item: any) => {
              return typeof item.url !== 'string' && !tweetMedia.includes(item.type)
            })
          ) {
            throw new Error(TWEETMESSAGE.MEDIAS_MUST_BE_AN_ARRAY_OF_MEDIA_OBJECT)
          }
          return true
        }
      }
    }
  })
)

export const tweetidValidator = validate(
  checkSchema(
    {
      tweet_id: {
        custom: {
          options: async (value: string, { req }) => {
            // if (!ObjectId.isValid(value)) {
            //   throw new ErrorWithStatus({
            //     status: HTTP_STATUS.BAD_REQUEST,
            //     message: TWEETMESSAGE.INVALID_TWEET_ID
            //   })
            // }
            const [tweet] = await databaseService.tweets
              .aggregate<Tweets>([
                // {
                //   $match: {
                //     parent_id: new ObjectId(value),
                //     type: 2
                //   }
                // },
                {
                  $lookup: {
                    from: 'hashtags',
                    localField: 'hashtags',
                    foreignField: '_id',
                    as: 'hashtags'
                  }
                },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'mentions',
                    foreignField: '_id',
                    as: 'mentions'
                  }
                },
                {
                  $addFields: {
                    mentions: {
                      $map: {
                        input: '$mentions',
                        as: 'mention',
                        in: {
                          _id: '$$mention._id',
                          name: '$$mention.name',
                          username: '$$mention.username',
                          email: '$$mention.email'
                        }
                      }
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'bookmarks',
                    localField: '_id',
                    foreignField: 'tweet_id',
                    as: 'bookmarks'
                  }
                },
                {
                  $lookup: {
                    from: 'likes',
                    localField: '_id',
                    foreignField: 'tweet_id',
                    as: 'likes'
                  }
                },
                {
                  $lookup: {
                    from: 'tweets',
                    localField: '_id',
                    foreignField: 'parent_id',
                    as: 'tweets_children'
                  }
                },
                {
                  $addFields: {
                    bookmarks: {
                      $size: '$bookmarks'
                    },
                    likes: {
                      $size: '$bookmarks'
                    },
                    retweet_count: {
                      $size: {
                        $filter: {
                          input: '$tweets_children',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.type', TweetType.Retweet]
                          }
                        }
                      }
                    },
                    comment_count: {
                      $size: {
                        $filter: {
                          input: '$tweets_children',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.type', TweetType.Comment]
                          }
                        }
                      }
                    },
                    quote_count: {
                      $size: {
                        $filter: {
                          input: '$tweets_children',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.type', TweetType.QuoteTweet]
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $project: {
                    tweets_children: 0
                  }
                },
                {
                  $skip: 5
                },
                {
                  $limit: 2
                }
              ])
              .toArray()
            if (!tweet) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.NOT_FOUND,
                message: TWEETMESSAGE.TWEET_NOT_FOUND
              })
            }
            ;(req as Request).tweet = tweet
            return true
          }
        }
      }
    },
    ['params', 'body']
  )
)

export const audienceValidator = wrapRequestHandler(async (req: Request, res: Response, next: NextFunction) => {
  const tweet = req.tweet as Tweets

  if (tweet.audience === TweetAudience.Twittercircle) {
    if (!req.decoded_authorization) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: userMessage.ACCESS_IS_REQUIRED
      })
    }

    const author = await databaseService.users.findOne({
      _id: new ObjectId(tweet.user_id)
    })

    if (!author || author.verify === UserVerifyStatus.Banned) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: userMessage.USER_NOTFOUND
      })
    }

    const { user_id } = req.decoded_authorization
    const tweet_circle = author.tweet_circle || []

    let isInTwitterCircle = false
    for (const user_circle_id of tweet_circle) {
      if (user_circle_id.equals(user_id)) {
        isInTwitterCircle = true
        break
      }
    }
    if (!author._id.equals(user_id) && !isInTwitterCircle) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: TWEETMESSAGE.TWEET_IS_NOT_PUBLIC
      })
    }
  }
  next()
})
export const gettweetChilrenValidator = validate(
  checkSchema(
    {
      tweet_type: {
        isIn: {
          options: [tweettype],
          errorMessage: TWEETMESSAGE.INVALID_TYPE
        }
      }
    },
    ['query']
  )
)
export const paginateValidator = validate(
  checkSchema({
    limit: {
      isNumeric: true,
      custom: {
        options: async (value, { req }) => {
          const num = Number(value)
          if (num > 100 || num < 1) {
            throw new Error('limit<100 or limit>=1')
          }
          return true
        }
      }
    },
    page: {
      isNumeric: true,
      custom: {
        options: async (value, { req }) => {
          const num = Number(value)
          if (num <= 0) {
            throw new Error('page>=0')
          }
          return true
        }
      }
    }
  })
)
