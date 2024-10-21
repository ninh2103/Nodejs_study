import { ObjectId } from 'mongodb'
import { TweetAudience, TweetType } from '~/constants/enums'
import { Media } from '../Others'
import _ from 'lodash'

interface TweetContructor {
  _id?: ObjectId
  user_id: ObjectId
  type: TweetType
  audience: TweetAudience
  content: string
  parent_id: null | string
  hashtags: ObjectId[]
  mentions: string[]
  medias: Media[]

  guest_view?: number
  user_view?: number
  created_at?: Date
  updated_at?: Date
}
export default class Tweets {
  _id?: ObjectId
  user_id: ObjectId
  type: TweetType
  audience: TweetAudience
  content: string
  parent_id: null | ObjectId
  hashtags: ObjectId[]
  mentions: ObjectId[]
  medias: Media[]
  guest_view: number

  user_view: number
  created_at: Date
  updated_at: Date
  constructor({
    _id,
    user_id,
    audience,
    content,
    guest_view,
    hashtags,
    medias,

    mentions,
    parent_id,
    type,
    user_view,
    created_at,
    updated_at
  }: TweetContructor) {
    const date = new Date()
    this._id = _id
    this.audience = audience
    this.content = content
    this.user_id = user_id
    this.guest_view = guest_view || 0
    this.hashtags = hashtags
    this.medias = medias

    this.mentions = mentions.map((item) => new ObjectId(item))
    this.parent_id = parent_id ? new ObjectId(parent_id) : null
    this.type = type
    this.user_view = user_view || 0
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
