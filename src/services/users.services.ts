import User from '~/models/schemas/Users.schema'
import databaseService from './database.services'
import { RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken, verifyToken } from '~/utils/jwt'
import { Role, Tokentype, UserVerifyStatus } from '~/constants/enums'
import RefreshToken from '~/models/schemas/RefreshToken.schema.'
import { ObjectId } from 'mongodb'
import { config } from 'dotenv'
import { userMessage } from '~/constants/messages'
import Follower from '~/models/schemas/Follower.schema'
import axios from 'axios'
import { ErrorWithStatus } from '~/models/errors'
import { HTTP_STATUS } from '~/constants/httpStatus'
import { sendEmail } from '~/utils/email'
import { Response } from 'express'
import { serialize } from 'cookie'
config()
class UsersService {
  private signAccessToken({ user_id, verify, role }: { user_id: string; verify: UserVerifyStatus; role: number }) {
    return signToken({
      payload: {
        user_id,
        token_type: Tokentype.AccessToken,
        verify,
        role // Role luôn có mặt trong payload
      },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      option: {
        expiresIn: process.env.ACCESS_TOKEN_EXPIREX_IN
      }
    })
  }

  private signRefreshToken({
    user_id,
    verify,
    exp,
    role
  }: {
    user_id: string
    verify: UserVerifyStatus
    exp?: number
    role: number
  }) {
    return signToken({
      payload: {
        user_id,
        token_type: Tokentype.RefreshToken,
        verify,
        role, // Role luôn có mặt trong payload
        ...(exp && { exp })
      },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      option: exp
        ? undefined
        : {
            expiresIn: process.env.REFRESH_TOKEN_EXPIREX_IN
          }
    })
  }

  private async signAccessandRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // Lấy role từ database
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })

    if (!user) {
      throw new Error('User not found')
    }

    const { role } = user // Lấy role từ database

    // Tạo access_token và refresh_token
    return Promise.all([
      this.signAccessToken({ user_id, verify, role }),
      this.signRefreshToken({ user_id, verify, role })
    ])
  }

  private signVerifyEmailToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: {
        user_id,
        token_type: Tokentype.EmailVerifyToken,
        verify
      },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      option: {
        expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIREX_IN
      }
    })
  }
  private signForgotPasswordToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: {
        user_id,
        token_type: Tokentype.ForgotPasswordToken,
        verify
      },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      option: {
        expiresIn: process.env.PASSWORD_FORGOT_TOKEN_EXPIREX_IN
      }
    })
  }
  async checkEmail(email: string) {
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }
  async register(payload: RegisterReqBody) {
    const user_id = new ObjectId()
    const username = user_id.toString()
    const email_verify_token = await this.signVerifyEmailToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })
    await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
        email_verify_token,
        data_of_birth: new Date(payload.data_of_birth),
        password: hashPassword(payload.password),
        username: username,
        role: Role.User
      })
    )
    const [access_token, refresh_token] = await this.signAccessandRefreshToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })
    const { iat, exp } = await this.decodedRefreshToken(refresh_token)
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token, iat, exp })
    )
    console.log('email verify token :', email_verify_token)
    await sendEmail(payload.email, payload.name, email_verify_token, 'verify')
    return {
      access_token,
      refresh_token
    }
  }
  async login(
    { user_id, verify }: { user_id: string; verify: UserVerifyStatus },
    res: Response // Truyền `res` vào để set cookie
  ) {
    const [access_token, refresh_token] = await this.signAccessandRefreshToken({
      user_id,
      verify
    })

    const { iat, exp } = await this.decodedRefreshToken(refresh_token)

    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token, iat, exp })
    )

    // Set cookies
    res.setHeader('Set-Cookie', [
      serialize('access_token', access_token, {
        httpOnly: true,
        secure: true, // Chỉ gửi qua HTTPS
        sameSite: 'none', // Tăng cường bảo mật CSRF
        maxAge: 7 * 24 * 60 * 60, // Thời gian sống của access token, ví dụ 1 giờ
        path: '/'
      }),
      serialize('refresh_token', refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60, // Refresh token sống trong 7 ngày
        path: '/'
      })
    ])

    return {
      access_token,
      refresh_token
    }
  }
  async logout(refresh_token: string, res: Response) {
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    res.clearCookie('refresh_token')
    res.clearCookie('access_token')
    return {
      message: userMessage.LOGOUT_SUCSESS
    }
  }
  async verifyEmail(user_id: string) {
    const [token] = await Promise.all([
      this.signAccessandRefreshToken({ user_id, verify: UserVerifyStatus.Verified }),
      databaseService.users.updateOne(
        {
          _id: new ObjectId(user_id)
        },
        {
          $set: {
            email_verify_token: '',
            verify: UserVerifyStatus.Verified,
            update_at: new Date()
          }
        }
      )
    ])
    const [access_token, refresh_token] = token
    const { iat, exp } = await this.decodedRefreshToken(refresh_token)
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token, iat, exp })
    )

    return {
      access_token,
      refresh_token
    }
  }
  async resendVerifyEmail(user_id: string) {
    const email_verify_token = await this.signVerifyEmailToken({ user_id, verify: UserVerifyStatus.Unverified })
    console.log('resend Verify Email: ', email_verify_token)

    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          email_verify_token
        },
        $currentDate: {
          update_at: true
        }
      }
    )
    return {
      message: userMessage.RESEND_EMAIL_VERIFY_SUCCESS
    }
  }
  async forgotPassword({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    const forgot_password_token = await this.signForgotPasswordToken({ user_id, verify })
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          forgot_password_token
        },
        $currentDate: {
          update_at: true
        }
      }
    )

    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })

    if (!user) {
      throw new Error('User not found after update')
    }
    await sendEmail(user.email, user.name, forgot_password_token, 'forgotPassword')
    console.log('Forgot Password Token: ', forgot_password_token)
    return {
      message: userMessage.CHECK_EMAIL_TO_RESET_PASSWORD
    }
  }
  async resetPassword(user_id: string, password: string) {
    databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          forgot_password_token: '',
          password: hashPassword(password)
        },
        $currentDate: {
          update_at: true
        }
      }
    )
  }
  async getMe(user_id: string) {
    const user = databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      {
        projection: {
          password: 0,
          forgot_password_token: 0,
          email_verify_token: 0
        }
      }
    )
    return user
  }

  async getUserProfile(viewer_id: string, target_user_id: string) {
    const viewer = await databaseService.users.findOne({ _id: new ObjectId(viewer_id) })
    if (!viewer) {
      throw new Error('Viewer not found')
    }

    const targetUser = await databaseService.users.findOne(
      { _id: new ObjectId(target_user_id) },
      {
        projection: {
          password: 0,
          forgot_password_token: 0,
          email_verify_token: 0
        }
      }
    )
    if (!targetUser) {
      throw new Error('Target user not found')
    }

    return targetUser
  }

  async updateMe(user_id: string, payload: UpdateMeReqBody) {
    const _payload = payload.data_of_birth ? { ...payload, data_of_birth: new Date(payload.data_of_birth) } : payload
    const user = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          ...(_payload as UpdateMeReqBody & { data_of_birth?: Date })
        },
        $currentDate: {
          update_at: true
        }
      },
      {
        returnDocument: 'after',
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return user
  }
  async follow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    if (follower === null) {
      await databaseService.followers.insertOne(
        new Follower({
          user_id: new ObjectId(user_id),
          followed_user_id: new ObjectId(followed_user_id)
        })
      )
      return {
        message: userMessage.FOLLOW_SUCCESS
      }
    }
    return {
      message: userMessage.FLOLLOWED
    }
  }
  async UnFollow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    if (follower === null) {
      return {
        message: userMessage.UNFOLLOW_SUCCESS
      }
    }
    await databaseService.followers.deleteOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    return {
      message: userMessage.UNFLOLLOWED
    }
  }
  async changePassword(user_id: string, password: string) {
    await databaseService.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      {
        $set: {
          password: hashPassword(password)
        },
        $currentDate: {
          update_at: true
        }
      }
    )
    return {
      message: userMessage.CHANGE_PASSWORD_SUCCESS
    }
  }
  private async getOauthGoogleToken(code: string) {
    const body = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CLIENT_URI,
      grant_type: 'authorization_code'
    }
    const { data } = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return data as {
      id_token: string
      access_token: string
    }
  }
  private async getGoogleUserInfo(access_token: string, id_token: string) {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      params: {
        access_token,
        alt: 'json'
      },
      headers: {
        Authorization: `Bearer${id_token}`
      }
    })
    return data as {
      id: string
      email: string
      verified_email: string
      name: string
      given_name: string
      family_name: string
      locale: string
      picture: string
    }
  }
  async oauth(code: string) {
    const { id_token, access_token } = await this.getOauthGoogleToken(code)
    const userInfo = await this.getGoogleUserInfo(access_token, id_token)
    if (!userInfo.verified_email) {
      throw new ErrorWithStatus({
        message: userMessage.GEMAIL_NOT_VERIFY,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }
    const user = await databaseService.users.findOne({ email: userInfo.email })
    if (user) {
      const [access_token, refresh_token] = await this.signAccessandRefreshToken({
        user_id: user._id.toString(),
        verify: user.verify
      })
      const { iat, exp } = await this.decodedRefreshToken(refresh_token)
      await databaseService.refreshTokens.insertOne(
        new RefreshToken({ user_id: user._id, token: refresh_token, iat, exp })
      )
      return {
        access_token,
        refresh_token,
        newUser: 0,
        verify: user.verify
      }
    } else {
      const password = Math.random().toString(36).substring(2, 10)
      const data = await this.register({
        email: userInfo.email,
        name: userInfo.name,
        data_of_birth: new Date().toISOString(),
        password,
        comfirm_password: password
      })
      return { ...data, newUser: 1, verify: UserVerifyStatus.Unverified }
    }
  }
  async refreshToken({
    user_id,
    verify,
    refresh_token,
    exp
  }: {
    user_id: string
    verify: UserVerifyStatus
    refresh_token: string
    exp: number
  }) {
    const [new_access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken({ user_id, verify, role: Role.User }),
      this.signRefreshToken({ user_id, verify, exp, role: Role.User }),
      databaseService.refreshTokens.deleteOne({ toke: refresh_token })
    ])
    const decoded_refresh_token = await this.decodedRefreshToken(refresh_token)
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: refresh_token,
        iat: decoded_refresh_token.iat,
        exp: decoded_refresh_token.exp
      })
    )
    return {
      access_token: new_access_token,
      refresh_token: new_refresh_token
    }
  }
  private decodedRefreshToken(refresh_token: string) {
    return verifyToken({
      token: refresh_token,
      secretOrPublicKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
    })
  }

  async getAllUser({ limit, user_id, page }: { user_id: string; limit: number; page: number }) {
    const [followedUsers, users] = await Promise.all([
      // Query to get the list of followed users
      databaseService.followers
        .find({
          user_id: new ObjectId(user_id)
        })
        .toArray(),

      // Query to get all users except the logged-in user and those who have been followed
      databaseService.users
        .find(
          {
            _id: {
              $ne: new ObjectId(user_id)
            }
          },
          {
            projection: {
              password: 0,
              forgot_password_token: 0,
              email_verify_token: 0
            }
          }
        )
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray()
    ])

    // Get the list of IDs of followed users
    const followedUserIds = followedUsers
      .map((follower) => follower.followed_user_id)
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id))

    // Filter the list of users to exclude those who have been followed
    const availableUsers = users.filter((user) => !followedUserIds.some((followedId) => followedId.equals(user._id)))

    return availableUsers
  }
  async getUserMessage({ limit, user_id, page }: { user_id: string; limit: number; page: number }) {
    // Lấy danh sách người dùng đã có cuộc trò chuyện với người dùng hiện tại
    const conversationUsers = await databaseService.conversations
      .find({
        $or: [{ sender_id: new ObjectId(user_id) }, { receiver_id: new ObjectId(user_id) }]
      })
      .toArray()

    // Trích xuất ID người dùng từ các cuộc trò chuyện, loại bỏ người dùng hiện tại
    const conversationUserIds = conversationUsers.reduce((ids, conversation) => {
      if (conversation.sender_id.toString() !== user_id) {
        ids.add(conversation.sender_id.toString())
      }
      if (conversation.receiver_id.toString() !== user_id) {
        ids.add(conversation.receiver_id.toString())
      }
      return ids
    }, new Set<string>())

    // Chuyển đổi Set ID thành mảng ObjectId
    const uniqueConversationUserIds = Array.from(conversationUserIds).map((id) => new ObjectId(id))

    // Lấy thông tin người dùng tham gia cuộc trò chuyện
    const availableUsers = await databaseService.users
      .find(
        {
          _id: {
            $in: uniqueConversationUserIds, // Chỉ bao gồm người dùng đã nhắn tin với người dùng hiện tại
            $ne: new ObjectId(user_id) // Loại bỏ người dùng hiện tại khỏi kết quả
          }
        },
        {
          projection: {
            password: 0,
            forgot_password_token: 0,
            email_verify_token: 0
          }
        }
      )
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    return availableUsers
  }
  async getFollower(user_id: string) {
    const followers = await databaseService.followers
      .find({
        followed_user_id: new ObjectId(user_id) // Truy vấn dựa trên ID của người được theo dõi
      })
      .toArray()

    // Bước 2: Lấy thông tin chi tiết của những người theo dõi
    const followerIds = followers.map((follower) => follower.user_id) // Giả sử trường chứa ID người theo dõi là user_id

    // Bước 3: Lấy thông tin của những người theo dõi từ collection users với projection
    const userDetails = await databaseService.users
      .find(
        {
          _id: { $in: followerIds.map((id) => new ObjectId(id)) } // Chuyển đổi ID thành ObjectId
        },
        {
          projection: {
            _id: 1, // Giữ lại ID người dùng
            name: 1, // Giữ lại tên người dùng
            username: 1, // Giữ lại username
            avatar: 1
          }
        }
      )
      .toArray()

    // Trả về thông tin chi tiết của các follower đã được lọc
    return userDetails
  }

  async getFollowing(user_id: string) {
    const following = await databaseService.followers
      .find({
        user_id: new ObjectId(user_id) // Truy vấn dựa trên ID của người dùng
      })
      .toArray()

    // Bước 2: Lấy thông tin chi tiết của những người đang được theo dõi từ collection users với projection
    const followingIds = following.map((f) => f.followed_user_id) // Giả sử trường chứa ID người được theo dõi là followed_user_id

    // Bước 3: Lấy thông tin của những người đang được theo dõi
    const followingDetails = await databaseService.users
      .find(
        {
          _id: { $in: followingIds.map((id) => new ObjectId(id)) } // Chuyển đổi ID thành ObjectId
        },
        {
          projection: {
            _id: 1, // Giữ lại ID người dùng
            name: 1, // Giữ lại tên người dùng
            username: 1,
            avatar: 1 // Giữ lại username
            // Thêm các trường khác mà bạn muốn hiển thị
          }
        }
      )
      .toArray()

    // Trả về thông tin chi tiết của những người đang được theo dõi
    return followingDetails
  }
  async getSearch({ searchTerm, limit }: { searchTerm: string; limit: number }) {
    if (!searchTerm.trim()) {
      return []
    }

    const users = await databaseService.users
      .find({
        name: { $regex: searchTerm, $options: 'i' }
      })
      .project({
        name: 1,
        username: 1,
        avatar: 1
      })
      .limit(limit)
      .toArray()

    return users
  }

  async getAllUserList(page: number, limit: number) {
    const skip = (page - 1) * limit

    const users = await databaseService.users
      .find(
        {
          verify: 1 // Lọc người dùng đã đăng ký (có verify = 1)
        },
        {
          projection: {
            _id: 1,
            name: 1,
            username: 1,
            avatar: 1
          }
        }
      )
      .skip(skip) // Số lượng bản ghi cần bỏ qua
      .limit(limit) // Số lượng bản ghi cần lấy
      .toArray()

    // Tính tổng số người dùng để trả về cùng dữ liệu
    const totalUsers = await databaseService.users.countDocuments({
      verify: 1
    })

    return {
      users,
      totalPages: Math.ceil(totalUsers / limit), // Tổng số trang
      currentPage: page, // Trang hiện tại
      totalUsers // Tổng số người dùng
    }
  }
  async deleteUser(user_id: string, _id: string) {
    await databaseService.users.deleteOne({
      _id: new ObjectId(_id)
    })
  }
}

const usersService = new UsersService()
export default usersService
