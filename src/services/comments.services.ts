import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'

class CommentServices {
  async commentTweet(user_id: string, tweet_id: string, content: string, parent_id: string) {
    const result = await databaseService.comments.findOneAndUpdate(
      {
        user_id: new ObjectId(user_id),
        tweet_id: new ObjectId(tweet_id),
        content,
        parent_id: parent_id ? new ObjectId(parent_id) : undefined
      },
      {
        $setOnInsert: {
          user_id: new ObjectId(user_id),
          tweet_id: new ObjectId(tweet_id),
          content,
          parent_id: parent_id ? new ObjectId(parent_id) : undefined,
          created_at: new Date(),
          updated_at: new Date()
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    )

    return result
  }

  async getCommentsWithUsers(tweet_id: string, limit: number, page: number) {
    const comments = await databaseService.comments
      .aggregate([
        { $match: { tweet_id: new ObjectId(tweet_id) } }, // Lọc theo tweet_id
        {
          $lookup: {
            from: 'users', // Tên collection users
            localField: 'user_id', // Trường user_id trong bảng comments
            foreignField: '_id', // Trường _id trong bảng users
            as: 'userDetails' // Tên cho kết quả join
          }
        },
        { $unwind: '$userDetails' },
        {
          $project: {
            content: 1,
            created_at: 1,
            parent_id: 1,
            'userDetails.username': 1,
            'userDetails.avatar': 1,
            'userDetails.name': 1
          }
        },
        {
          $lookup: {
            from: 'comments', // Tên collection comments cho replies
            localField: '_id', // Trường _id trong bảng comments (comment cha)
            foreignField: 'parent_id', // Trường parent_id trong bảng replies
            as: 'replies' // Tên cho kết quả join comment con
          }
        },
        { $unwind: { path: '$replies', preserveNullAndEmptyArrays: true } }, // Đảm bảo vẫn giữ comment cha nếu không có replies
        {
          $lookup: {
            from: 'users', // Tên collection users cho replies
            localField: 'replies.user_id', // Trường user_id trong replies
            foreignField: '_id', // Trường _id trong users
            as: 'replies.userDetails' // Tên cho kết quả join
          }
        },
        { $unwind: { path: '$replies.userDetails', preserveNullAndEmptyArrays: true } }, // Unwind userDetails cho replies
        {
          $group: {
            _id: '$_id',
            content: { $first: '$content' },
            created_at: { $first: '$created_at' },
            parent_id: { $first: '$parent_id' },
            userDetails: { $first: '$userDetails' },
            replies: {
              $push: {
                _id: '$replies._id',
                content: '$replies.content',
                created_at: '$replies.created_at',
                parent_id: '$replies.parent_id',
                userDetails: {
                  // Thay thế các trường lồng nhau bằng đối tượng userDetails
                  username: { $getField: { field: 'username', input: '$replies.userDetails' } },
                  avatar: { $getField: { field: 'avatar', input: '$replies.userDetails' } },
                  name: { $getField: { field: 'name', input: '$replies.userDetails' } }
                }
              }
            }
          }
        },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ])
      .toArray()

    // Chuyển đổi thời gian và thêm thông tin cho comment cha
    const commentsWithHours = comments.map((comment) => {
      const hoursSinceComment = this.getHoursSinceComment(comment.created_at)
      return {
        ...comment,
        hoursSinceComment,
        replies: comment.replies.map((reply: any) => ({
          ...reply,
          hoursSinceReply: this.getHoursSinceComment(reply.created_at) // Tính toán thời gian từ khi reply được tạo
        }))
      }
    })

    return commentsWithHours
  }

  private getHoursSinceComment(createdAt: string): number {
    const commentDate = new Date(createdAt) // Chuyển đổi chuỗi thành Date
    const now = new Date() // Lấy thời gian hiện tại
    const diffInMilliseconds = now.getTime() - commentDate.getTime() // Tính sự chênh lệch thời gian
    const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60)) // Chuyển đổi thành giờ
    return diffInHours
  }
}

export default new CommentServices()
