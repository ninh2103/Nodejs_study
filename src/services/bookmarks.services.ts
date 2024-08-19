import Bookmark from '~/models/schemas/Bookmarks.schema'
import databaseService from './database.services'
import { ObjectId, WithId } from 'mongodb'

class BookmarkServices {
  async bookmarkTweet(user_id: string, tweet_id: string) {
    const result = await databaseService.bookmarks.findOneAndUpdate(
      { user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) },
      {
        $setOnInsert: new Bookmark({
          user_id: new ObjectId(user_id),
          tweet_id: new ObjectId(tweet_id)
        })
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    )

    return result as WithId<Bookmark>
  }
  async unBookmarkTweet(user_id: string, tweet_id: string) {
    const result = await databaseService.bookmarks.findOneAndDelete(
      { user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) },
      {}
    )

    return result
  }
  async unBookmarkId(bookmarks_id: string) {
    const result = await databaseService.bookmarks.findOneAndDelete({ bookmarks_id: new ObjectId(bookmarks_id) })

    return result
  }
}
const bookmarksService = new BookmarkServices()
export default bookmarksService
