import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '~/constants/enums'

interface userType {
  _id?: ObjectId
  name: string
  email: string
  data_of_birth: Date
  password: string
  create_at?: Date
  update_at?: Date
  email_verify_token?: string
  forgot_password_token?: string
  verify?: UserVerifyStatus
  bio?: string
  tweet_circle?: ObjectId[]
  location?: string
  website?: string
  username?: string
  avatar?: string
  cover_photo?: string
}
export default class User {
  _id?: ObjectId
  name: string
  email: string
  data_of_birth: Date
  password: string
  create_at: Date
  update_at: Date
  tweet_circle: ObjectId[]
  email_verify_token: string
  forgot_password_token: string
  verify: UserVerifyStatus
  bio: string
  location: string
  website: string
  username: string
  avatar: string
  cover_photo: string

  constructor(user: userType) {
    const date = new Date()
    this._id = user._id
    this.name = user.name || ''
    this.email = user.email
    this.avatar = user.avatar || ''
    this.bio = user.bio || ''
    this.cover_photo = user.cover_photo || ''
    this.create_at = user.create_at || date
    this.data_of_birth = user.data_of_birth || new Date()
    this.location = user.location || ''
    this.password = user.password
    this.tweet_circle = user.tweet_circle || []
    this.username = user.username || ''
    this.update_at = user.update_at || date
    this.website = user.website || ''
    this.verify = user.verify || UserVerifyStatus.Unverified
    this.email_verify_token = user.email_verify_token || ''
    this.forgot_password_token = user.forgot_password_token || ''
  }
}
