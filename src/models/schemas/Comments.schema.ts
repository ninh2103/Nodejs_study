import { ObjectId } from 'mongodb'

interface CommentType {
  _id?: ObjectId
  user_id: ObjectId
  tweet_id: ObjectId
  parent_id: ObjectId
  content: string
  creater_at?: Date
}
export default class Comment {
  _id: ObjectId
  user_id: ObjectId
  tweet_id: ObjectId
  creater_at?: Date
  content: string
  parent_id: ObjectId
  constructor({ _id, user_id, tweet_id, creater_at, parent_id, content }: CommentType) {
    this._id = _id || new ObjectId()
    this.user_id = user_id
    this.tweet_id = tweet_id
    this.creater_at = creater_at || new Date()
    this.content = content
    this.parent_id = parent_id
  }
}
