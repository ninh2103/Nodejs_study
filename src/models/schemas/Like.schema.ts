import { ObjectId } from 'mongodb'

interface LikeType {
  _id?: ObjectId
  user_id: ObjectId
  tweet_id: ObjectId
  creater_at?: Date
}
export default class Like {
  _id: ObjectId
  user_id: ObjectId
  tweet_id: ObjectId
  creater_at?: Date
  constructor({ _id, user_id, tweet_id, creater_at }: LikeType) {
    this._id = _id || new ObjectId()
    this.user_id = user_id
    this.tweet_id = tweet_id
    this.creater_at = creater_at || new Date()
  }
}
