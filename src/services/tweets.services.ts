import { TweetReqBody } from '~/models/requests/tweet.requests'
import databaseService from './database.services'
import Tweets from '~/models/schemas/Tweets.schema'
import { ObjectId, WithId } from 'mongodb'
import Hashtag from '~/models/schemas/Hasahtags.schema'
import { TweetType } from '~/constants/enums'

// class TweetsService {
//   async checkAndCreateHashtags(hashtags: string[]) {
//     const hashtagPromises = hashtags.map(async (hashtag) => {
//       let hashtagDocument = await databaseService.hashtags.findOne({ name: hashtag })

//       if (!hashtagDocument) {
//         const insertResult = await databaseService.hashtags.insertOne(new Hashtag({ name: hashtag }))
//         const insertedId = insertResult.insertedId

//         hashtagDocument = await databaseService.hashtags.findOne({ _id: insertedId })
//       }

//       return hashtagDocument as WithId<Hashtag>
//     })

//     const hashtagDocuments = await Promise.all(hashtagPromises)

//     const hashtagIds = hashtagDocuments.map((hashtag) => hashtag._id)
//     return hashtagIds
//   }

class TweetsService {
  async checkAndCreateHashtags(hashtags: string[]) {
    const hashtagDocoment = await Promise.all(
      hashtags.map((hashtag) => {
        return databaseService.hashtags.findOneAndUpdate(
          {
            name: hashtag
          },
          {
            $setOnInsert: new Hashtag({ name: hashtag })
          },
          {
            upsert: true,
            returnDocument: 'after'
          }
        )
      })
    )
    return hashtagDocoment.map((hashtags) => (hashtags as WithId<Hashtag>)._id)
  }
  async createTweet(user_id: string, body: TweetReqBody) {
    const hashtags = await this.checkAndCreateHashtags(body.hashtags)

    const result = await databaseService.tweets.insertOne(
      new Tweets({
        audience: body.audience,
        content: body.content,
        hashtags,
        mentions: body.mentions,
        medias: body.medias,
        parent_id: body.parent_id,
        type: body.type,
        user_id: new ObjectId(user_id)
      })
    )
    const twett = await databaseService.tweets.findOne({ _id: result.insertedId })
    return twett
  }
  async increaseView(tweet_id: string) {
    // Tăng user_view cho bài viết có tweet_id
    const result = await databaseService.tweets.findOneAndUpdate(
      {
        _id: new ObjectId(tweet_id) // Tìm bài viết theo ID
      },
      {
        $inc: { user_view: 1 }, // Chỉ tăng user_view lên 1
        $currentDate: {
          updated_at: true // Cập nhật trường updated_at
        }
      },
      {
        returnDocument: 'after', // Trả về tài liệu sau khi cập nhật
        projection: {
          user_view: 1 // Chỉ trả về trường user_view
        }
      }
    )

    return result as WithId<{
      user_view: number
    }>
  }

  async getLikesCount(tweet_id: string) {
    const likesCount = await databaseService.likes.countDocuments({ tweet_id: new ObjectId(tweet_id) })
    return likesCount
  }

  async getTweetDetail(tweet_id: string, user_id: string) {
    const tweetDetail = await databaseService.tweets.findOne({
      _id: new ObjectId(tweet_id)
    })

    if (!tweetDetail) {
      throw new Error('Bài viết không tồn tại')
    }

    // Check if the logged-in user has liked the tweet
    const userLike = await databaseService.likes.findOne({
      tweet_id: new ObjectId(tweet_id),
      user_id: new ObjectId(user_id)
    })
    const userBooknark = await databaseService.bookmarks.findOne({
      tweet_id: new ObjectId(tweet_id),
      user_id: new ObjectId(user_id)
    })

    // Add the isLike field to the tweet detail
    const tweetWithIsLike = {
      ...tweetDetail,
      isLike: !!userLike,
      isBookmark: !!userBooknark // true if user has liked, false otherwise
    }

    return tweetWithIsLike
  }

  async getTweetChildren({
    tweet_id,
    tweet_type,
    limit,
    page,
    user_id
  }: {
    tweet_id: string
    tweet_type: TweetType
    limit: number
    page: number
    user_id?: string
  }) {
    const tweets = await databaseService.tweets
      .aggregate<Tweets>([
        {
          $match: {
            parent_id: new ObjectId(tweet_id),
            type: tweet_type
          }
        },
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
                  name: '$$mention.name'
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
          $addFields: {
            bookmarks: {
              $size: '$bookmarks'
            }
          }
        },
        {
          $lookup: {
            from: 'tweets',
            localField: '_id',
            foreignField: 'parent_id',
            as: 'tweet_chilren'
          }
        },
        {
          $addFields: {
            retweet_count: {
              $size: {
                $filter: {
                  input: '$tweet_chilren',
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
                  input: '$tweet_chilren',
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
                  input: '$tweet_chilren',
                  as: 'item',
                  cond: {
                    $eq: ['$$item.type', TweetType.QuoteTweet]
                  }
                }
              }
            },

            view: {
              $add: ['$user_view', '$guest_view']
            }
          }
        },

        {
          $project: {
            tweet_chilren: 0
          }
        },
        {
          $skip: limit * (page - 1)
        },
        {
          $limit: limit
        }
      ])
      .toArray()
    const ids = tweets.map((tweet) => tweet._id as ObjectId)
    const inc = user_id ? { user_view: 1 } : { guest_view: 1 }
    const date = new Date()
    const [, total] = await Promise.all([
      databaseService.tweets.updateMany(
        {
          _id: {
            $in: ids
          }
        },
        {
          $inc: inc,
          $set: {
            updated_at: date
          }
        }
      ),
      databaseService.tweets.countDocuments({
        parent_id: new ObjectId(tweet_id),
        type: tweet_type
      })
    ])
    tweets.forEach((tweet) => {
      tweet.updated_at = date
      if (user_id) {
        tweet.user_view += 1
      } else {
        tweet.guest_view += 1
      }
    })
    return { tweets, total }
  }

  async getNewfeeds({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
    const user_id_obj = new ObjectId(user_id)

    const followed_user_ids = await databaseService.followers
      .find(
        {
          user_id: user_id_obj
        },
        {
          projection: {
            followed_user_id: 1,
            _id: 0
          }
        }
      )
      .toArray()

    // Lấy danh sách ID người dùng được theo dõi và thêm ID người dùng hiện tại
    const ids = followed_user_ids.map((item) => item.followed_user_id)
    ids.push(user_id_obj)

    const tweets = await databaseService.tweets
      .aggregate([
        {
          $match: {
            user_id: {
              $in: ids
            },
            'medias.type': 0
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user'
          }
        },
        {
          $match: {
            $or: [
              {
                audience: 0
              },
              {
                $and: [
                  {
                    audience: 1
                  },
                  {
                    'user.tweet_circle': {
                      $in: [user_id_obj]
                    }
                  }
                ]
              }
            ]
          }
        },
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
              $size: '$likes'
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
            },
            isLiked: {
              $in: [user_id_obj, '$likes.user_id']
            },
            isBookmarked: {
              $in: [user_id_obj, '$bookmarks.user_id']
            }
          }
        },
        {
          $project: {
            tweets_children: 0,
            user: {
              password: 0,
              data_of_birth: 0,
              email_verify_token: 0,
              forgot_password_token: 0,
              tweet_circle: 0
            }
          }
        },
        {
          $skip: (page - 1) * limit
        },
        {
          $limit: limit
        }
      ])
      .toArray()

    return tweets
  }

  async getMyPosts({ user_id }: { user_id: string }) {
    const user_id_obj = new ObjectId(user_id)

    // Truy vấn để lấy bài viết của người dùng và các thông tin bổ sung
    const results = await databaseService.users
      .aggregate([
        {
          $match: {
            _id: user_id_obj // Lọc theo user_id
          }
        },
        {
          $facet: {
            // Lấy các bài viết của người dùng có ảnh, không có video
            posts: [
              {
                $lookup: {
                  from: 'tweets',
                  localField: '_id',
                  foreignField: 'user_id',
                  as: 'tweets'
                }
              },
              { $unwind: '$tweets' },
              {
                $replaceRoot: { newRoot: '$tweets' }
              },
              {
                $match: {
                  // Lọc bài viết chứa ảnh, không chứa video
                  medias: { $elemMatch: { type: 0 } }
                  //media: { $not: { $elemMatch: { type: 'video' } } }
                }
              },
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
                    $size: '$likes'
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
                  },
                  isLiked: {
                    $in: [user_id_obj, '$likes.user_id']
                  }
                }
              },
              {
                $project: {
                  tweets_children: 0
                }
              }
            ],
            // Lấy số lượng người theo dõi và số người dùng mà người dùng hiện tại đang theo dõi
            followStats: [
              {
                $lookup: {
                  from: 'follow',
                  localField: '_id',
                  foreignField: 'user_id',
                  as: 'following'
                }
              },
              {
                $lookup: {
                  from: 'follow',
                  localField: '_id',
                  foreignField: 'followed_user_id',
                  as: 'followers'
                }
              },
              {
                $project: {
                  following_count: { $size: '$following' },
                  followers_count: { $size: '$followers' }
                }
              }
            ],
            // Lấy tổng số bài viết của người dùng hiện tại
            postCount: [
              {
                $lookup: {
                  from: 'tweets',
                  localField: '_id',
                  foreignField: 'user_id',
                  as: 'all_posts'
                }
              },
              {
                $project: {
                  total_posts: { $size: '$all_posts' }
                }
              }
            ]
          }
        },
        {
          $project: {
            posts: 1,
            followStats: { $arrayElemAt: ['$followStats', 0] },
            postCount: { $arrayElemAt: ['$postCount', 0] }
          }
        }
      ])
      .toArray()

    const userPosts = results[0]?.posts || []
    const followStats = results[0]?.followStats || { following_count: 0, followers_count: 0 }
    const postCount = results[0]?.postCount?.total_posts || 0

    return {
      posts: userPosts,
      followingCount: followStats.following_count,
      followersCount: followStats.followers_count,
      postCount
    }
  }

  async getUserProfilePosts({ profile_user_id, viewer_user_id }: { profile_user_id: string; viewer_user_id: string }) {
    const profileUserIdObj = new ObjectId(profile_user_id)
    const viewerUserIdObj = new ObjectId(viewer_user_id)

    // Truy vấn để lấy bài viết của người dùng mà bạn đang xem hồ sơ và các thông tin bổ sung
    const results = await databaseService.users
      .aggregate([
        {
          $match: {
            _id: profileUserIdObj // Lọc theo user_id của người dùng mà bạn đang xem
          }
        },
        {
          $facet: {
            // Lấy các bài viết của người dùng mà bạn đang xem hồ sơ
            posts: [
              {
                $lookup: {
                  from: 'tweets',
                  localField: '_id',
                  foreignField: 'user_id',
                  as: 'tweets'
                }
              },
              { $unwind: '$tweets' },
              {
                $replaceRoot: { newRoot: '$tweets' }
              },
              {
                // Lọc bài viết có ảnh, media.type = 0
                $match: {
                  'medias.type': 0 // Chỉ lấy các bài viết có ảnh
                }
              },
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
                    $size: '$likes'
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
                  },
                  isLiked: {
                    $in: [viewerUserIdObj, '$likes.user_id'] // Kiểm tra xem người đang xem có thích bài viết hay không
                  }
                }
              },
              {
                $project: {
                  tweets_children: 0
                }
              }
            ],
            // Lấy số lượng người theo dõi và số người dùng mà người dùng hiện tại đang theo dõi
            followStats: [
              {
                $lookup: {
                  from: 'follow',
                  localField: '_id',
                  foreignField: 'user_id',
                  as: 'following'
                }
              },
              {
                $lookup: {
                  from: 'follow',
                  localField: '_id',
                  foreignField: 'followed_user_id',
                  as: 'followers'
                }
              },
              {
                $project: {
                  following_count: { $size: '$following' },
                  followers_count: { $size: '$followers' }
                }
              }
            ],
            // Lấy tổng số bài viết của người dùng mà bạn đang xem
            postCount: [
              {
                $lookup: {
                  from: 'tweets',
                  localField: '_id',
                  foreignField: 'user_id',
                  as: 'all_posts'
                }
              },
              {
                $project: {
                  total_posts: { $size: '$all_posts' }
                }
              }
            ]
          }
        },
        {
          $project: {
            posts: 1,
            followStats: { $arrayElemAt: ['$followStats', 0] },
            postCount: { $arrayElemAt: ['$postCount', 0] }
          }
        }
      ])
      .toArray()

    const userPosts = results[0]?.posts || []
    const followStats = results[0]?.followStats || { following_count: 0, followers_count: 0 }
    const postCount = results[0]?.postCount?.total_posts || 0

    return {
      posts: userPosts,
      followingCount: followStats.following_count,
      followersCount: followStats.followers_count,
      postCount
    }
  }

  async getRandomNewFeed({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
    const user_id_obj = new ObjectId(user_id)

    // 1. Lấy danh sách các ID người dùng mà người dùng hiện tại theo dõi
    const followed_user_ids = await databaseService.followers
      .find({ user_id: user_id_obj }, { projection: { followed_user_id: 1, _id: 0 } })
      .toArray()

    const ids = followed_user_ids.map((item) => item.followed_user_id)
    ids.push(user_id_obj) // Thêm ID người dùng hiện tại

    // 2. Tìm các bài viết không thuộc về các người dùng đã theo dõi
    const posts = await databaseService.tweets
      .aggregate([
        {
          $match: {
            user_id: {
              $nin: ids // Lọc các bài viết không thuộc về các người dùng đã theo dõi
            },
            'medias.type': 0
          }
        },
        {
          $sample: { size: limit } // Lấy các bài viết ngẫu nhiên
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user'
          }
        },
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
              $size: '$likes'
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
            },
            isLiked: {
              $in: [user_id_obj, '$likes.user_id']
            },
            isBookmarked: {
              $in: [user_id_obj, '$bookmarks.user_id']
            }
          }
        },
        {
          $project: {
            tweets_children: 0,
            user: {
              password: 0,
              data_of_birth: 0,
              email_verify_token: 0,
              forgot_password_token: 0,
              tweet_circle: 0
            }
          }
        },
        {
          $skip: (page - 1) * limit
        },
        {
          $limit: limit
        }
      ])
      .toArray()

    return posts
  }

  async getAllNewfeeds({ limit, page }: { limit: number; page: number }) {
    const tweets = await databaseService.tweets
      .aggregate([
        {
          $match: {
            'medias.type': 0
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user'
          }
        },
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
              $size: '$likes'
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
            tweets_children: 0,
            user: {
              password: 0,
              data_of_birth: 0,
              email_verify_token: 0,
              forgot_password_token: 0,
              tweet_circle: 0
            }
          }
        },
        {
          $skip: (page - 1) * limit
        },
        {
          $limit: limit
        }
      ])
      .toArray()

    return tweets
  }
  async deleteTweet(user_id: string, _id: string) {
    await databaseService.tweets.deleteOne({
      _id: new ObjectId(_id)
    })
  }

  async getVideoNewfeeds({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
    const user_id_obj = new ObjectId(user_id)

    const followed_user_ids = await databaseService.followers
      .find(
        {
          user_id: user_id_obj
        },
        {
          projection: {
            followed_user_id: 1,
            _id: 0
          }
        }
      )
      .toArray()

    // Lấy danh sách ID người dùng được theo dõi và thêm ID người dùng hiện tại
    const ids = followed_user_ids.map((item) => item.followed_user_id)
    ids.push(user_id_obj)

    const tweets = await databaseService.tweets
      .aggregate([
        {
          $match: {
            user_id: {
              $in: ids
            },
            'medias.type': 1
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user'
          }
        },
        {
          $match: {
            $or: [
              {
                audience: 0
              },
              {
                $and: [
                  {
                    audience: 1
                  },
                  {
                    'user.tweet_circle': {
                      $in: [user_id_obj]
                    }
                  }
                ]
              }
            ]
          }
        },
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
              $size: '$likes'
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
            },
            isLiked: {
              $in: [user_id_obj, '$likes.user_id']
            },
            isBookmarked: {
              $in: [user_id_obj, '$bookmarks.user_id']
            }
          }
        },
        {
          $project: {
            tweets_children: 0,
            user: {
              password: 0,
              data_of_birth: 0,
              email_verify_token: 0,
              forgot_password_token: 0,
              tweet_circle: 0
            }
          }
        },
        {
          $skip: (page - 1) * limit
        },
        {
          $limit: limit
        }
      ])
      .toArray()

    return tweets
  }
}

const tweetsService = new TweetsService()
export default tweetsService
