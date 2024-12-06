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

  async getAllBookmarks(user_id: string) {
    // Lấy tất cả các bookmark của người dùng hiện tại
    const bookmarks = await databaseService.bookmarks
      .find(
        { user_id: new ObjectId(user_id) },
        { projection: { tweet_id: 1 } } // Lấy chỉ `tweet_id`
      )
      .toArray()

    // Lấy danh sách ID của các tweet đã bookmark
    const tweetIds = bookmarks.map((bookmark) => bookmark.tweet_id)

    if (tweetIds.length === 0) {
      return [] // Không có bài viết nào được bookmark
    }

    // Truy vấn danh sách bài viết dựa trên ID
    const tweets = await databaseService.tweets.find({ _id: { $in: tweetIds } }).toArray()

    return tweets
  }
}
const bookmarksService = new BookmarkServices()
export default bookmarksService
