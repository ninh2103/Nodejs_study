import { MongoClient, Db, Collection } from 'mongodb'
import dotenv from 'dotenv'
import User from '~/models/schemas/Users.schema'
import RefreshToken from '~/models/schemas/RefreshToken.schema.'
import Follower from '~/models/schemas/Follower.schema'
import e from 'express'
import Tweets from '~/models/schemas/Tweets.schema'
import Hashtag from '~/models/schemas/Hasahtags.schema'
import Bookmark from '~/models/schemas/Bookmarks.schema'
import Like from '~/models/schemas/Like.schema'
import Conversation from '~/models/schemas/Conversasations'
dotenv.config()
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@twitter.wne2r5k.mongodb.net/?retryWrites=true&w=majority&appName=twitter`

class DatabaseService {
  private client: MongoClient
  private db: Db
  constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.NAME)
  }
  async conect() {
    try {
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (error) {
      console.log('Error', error)
      throw error
    }
  }
  async indexUsers() {
    const exits = await this.users.indexExists(['email_1', 'email_1_password_1', 'username_1'])
    if (!exits) {
      this.users.createIndex({ email: 1, password: 1 })
      this.users.createIndex({ email: 1 }, { unique: true })
      this.users.createIndex({ username: 1 }, { unique: true })
    }
  }
  async indexRefreshToken() {
    const exits = await this.refreshTokens.indexExists(['exp_1', 'token_1'])
    if (!exits) {
      this.refreshTokens.createIndex({ token: 1 })
      this.refreshTokens.createIndex({ exp: 1 }, { expireAfterSeconds: 0 })
    }
  }
  async indexFollowers() {
    const exits = await this.followers.indexExists(['user_id_1_followed_user_id_1'])
    if (!exits) {
      this.followers.createIndex({ user_id: 1, followed_user_id: 1 })
    }
  }
  get likes(): Collection<Like> {
    return this.db.collection(process.env.DB_LIKE_CONLECTION as string)
  }
  get bookmarks(): Collection<Bookmark> {
    return this.db.collection(process.env.DB_BOOKMARK_CONLECTION as string)
  }
  get hashtags(): Collection<Hashtag> {
    return this.db.collection(process.env.DB_HASHTAG_CONLECTION as string)
  }
  get tweets(): Collection<Tweets> {
    return this.db.collection(process.env.DB_TWEETS_CONLECTION as string)
  }

  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USERS_CONLECTION as string)
  }
  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESHTOKEN_COLECION as string)
  }

  get followers(): Collection<Follower> {
    return this.db.collection(process.env.DB_FOLLOWERS_CONLECTION as string)
  }
  get conversations(): Collection<Conversation> {
    return this.db.collection(process.env.DB_CONVERSATION_CONLECTION as string)
  }
}

const databaseService = new DatabaseService()
export default databaseService
