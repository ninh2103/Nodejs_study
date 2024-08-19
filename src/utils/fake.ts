import { faker } from '@faker-js/faker'
import { ObjectId } from 'mongodb'
import { TweetAudience, TweetType, UserVerifyStatus } from '~/constants/enums'
import { RegisterReqBody } from '~/models/requests/User.requests'
import { TweetReqBody } from '~/models/requests/tweet.requests'
import User from '~/models/schemas/Users.schema'
import databaseService from '~/services/database.services'
import { hashPassword } from './crypto'
import Follower from '~/models/schemas/Follower.schema'
import tweetsService from '~/services/tweets.services'

const PASSWORD = 'Ninh123!'
const MYID = new ObjectId('6610d60d2e5f568960e93d43')
const USER_COUNT = 100

const createdrandomUser = () => {
  const user: RegisterReqBody = {
    name: faker.internet.displayName(),
    email: faker.internet.email(),
    password: PASSWORD,
    comfirm_password: PASSWORD,
    data_of_birth: faker.date.past().toISOString()
  }
  return user
}
const createRandomTweet = () => {
  const tweet: TweetReqBody = {
    type: TweetType.Tweet,
    audience: TweetAudience.everyone,
    content: faker.lorem.paragraph({
      min: 10,
      max: 160
    }),
    hashtags: [],
    medias: [],
    mentions: [],
    parent_id: null
  }
  return tweet
}
const users: RegisterReqBody[] = faker.helpers.multiple(createdrandomUser, {
  count: USER_COUNT
})

const insertMutipleUsers = async (users: RegisterReqBody[]) => {
  const result = await Promise.all(
    users.map(async (user) => {
      const user_id = new ObjectId()
      await databaseService.users.insertOne(
        new User({
          ...user,
          username: `user${user_id.toString()}`,
          password: hashPassword(user.password),
          data_of_birth: new Date(user.data_of_birth),
          verify: UserVerifyStatus.Verified
        })
      )
      return user_id
    })
  )
  return result
}
const followMutipleUsers = async (user_id: ObjectId, followed_user_ids: ObjectId[]) => {
  const result = await Promise.all(
    followed_user_ids.map((followed_user_id) =>
      databaseService.followers.insertOne(
        new Follower({
          user_id,
          followed_user_id: new ObjectId(followed_user_id)
        })
      )
    )
  )
  console.log(`Followed ${result.length} users`)
}
const insertMutipleTweets = async (ids: ObjectId[]) => {
  let count = 0
  const result = await Promise.all(
    ids.map(async (id, index) => {
      await Promise.all([
        tweetsService.createTweet(id.toString(), createRandomTweet()),
        tweetsService.createTweet(id.toString(), createRandomTweet())
      ])
      count += 2
    })
  )
  return result
}

insertMutipleUsers(users).then((ids) => {
  followMutipleUsers(new ObjectId(MYID), ids)
  insertMutipleTweets(ids)
})
