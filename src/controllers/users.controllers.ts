import { config } from 'dotenv'
import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import _ from 'lodash'
import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '~/constants/enums'
import { HTTP_STATUS } from '~/constants/httpStatus'
import { userMessage } from '~/constants/messages'
import { PaginationReq } from '~/models/requests/tweet.requests'
import {
  ChangePasswordReqBody,
  FollowReqBody,
  ForgotPasswordReqBody,
  LoginReqBody,
  RefreshTokenBodyReq,
  RegisterReqBody,
  ResetPasswordREqBody,
  TokenPayload,
  UnFollowReqParams,
  UpdateMeReqBody,
  VerifyForgotPasswordTokenReqBody
} from '~/models/requests/User.requests'
import User from '~/models/schemas/Users.schema'
import databaseService from '~/services/database.services'
import usersService from '~/services/users.services'
config()
export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  const user = req.user as User
  const user_id = user._id as ObjectId
  const result = await usersService.login({ user_id: user_id.toString(), verify: user.verify }, res)
  return res.json({
    message: 'login success',
    result
  })
}
export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  const result = await usersService.register(req.body)
  return res.json({
    message: 'register success',
    result
  })
}
export const logoutController = async (req: Request, res: Response) => {
  const { refresh_token } = req.body
  const result = await usersService.logout(refresh_token, res)
  return res.json(result)
}
export const emailVerifyController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_email_verify_token as TokenPayload
  const user = await databaseService.users.findOne({
    _id: new ObjectId(user_id)
  })
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: userMessage.USER_NOTFOUND
    })
  }
  if (user.email_verify_token === '') {
    return res.json({
      message: userMessage.EMAIL_ALREADY_VERIFY_TOKEN
    })
  }
  const result = await usersService.verifyEmail(user_id)
  return res.json({
    message: userMessage.EMAIL_VERIFY_SUCCESS,
    result
  })
}
export const resendVerifyEmailController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: userMessage.USER_NOTFOUND
    })
  }
  if (user.verify === UserVerifyStatus.Verified) {
    return res.json({
      message: userMessage.EMAIL_ALREADY_VERIFY_TOKEN
    })
  }
  const result = await usersService.resendVerifyEmail(user_id)
  return res.json(result)
}
export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { _id, verify } = req.user as User
  console.log(_id)
  const result = await usersService.forgotPassword({ user_id: (_id as ObjectId).toString(), verify })
  return res.json(result)
}
export const verifyForgotPasswordController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  return res.json({
    message: userMessage.VERIFY_FORGOT_PASSWORD_SUCCESS
  })
}
export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordREqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_forgot_password_token as TokenPayload
  const { password } = req.body
  const result = usersService.resetPassword(user_id, password)

  return res.json({
    message: userMessage.RESET_PASSWORD_SUCCESS
  })
}
export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await usersService.getMe(user_id)
  return res.json({
    message: userMessage.GET_ME_SUCCESS,
    result: user
  })
}

export const getUserProfileController = async (req: Request, res: Response, next: NextFunction) => {
  const viewer_id = req.decoded_authorization?.user_id
  const target_user_id = req.params.user_id

  if (!viewer_id) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const user = await usersService.getUserProfile(viewer_id, target_user_id)

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json({
    message: userMessage.GET_USER_PROFILE_SUCCESS,
    result: user
  })
}

export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const body = req.body
  const user = await usersService.updateMe(user_id, body)
  return res.json({
    message: userMessage.UPDATE_ME_SUCCESS,
    result: user
  })
}
export const followController = async (
  req: Request<ParamsDictionary, any, FollowReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { followed_user_id } = req.body
  const result = await usersService.follow(user_id, followed_user_id)
  return res.json(result)
}
export const unFollowController = async (req: Request<UnFollowReqParams>, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { user_id: follow_user_id } = req.params
  const result = await usersService.UnFollow(user_id, follow_user_id)
  return res.json(result)
}

export const changepasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { password } = req.body
  const result = await usersService.changePassword(user_id, password)
  return res.json(result)
}
export const oauthController = async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.query
  const result = await usersService.oauth(code as string)
  const urlRedirect = `${process.env.CLIENT_REDIRECT_CALLBACK as string}?access_token=${result.access_token}&refresh_token=${result.refresh_token}&newUser=${result.newUser}&verify=${result.verify}`
  return res.redirect(urlRedirect)
}
export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenBodyReq>,
  res: Response,
  next: NextFunction
) => {
  const { refresh_token } = req.body
  const { user_id, verify, exp } = req.decoded_refresh_token as TokenPayload
  const result = await usersService.refreshToken({ refresh_token, user_id, verify, exp })
  return res.json({
    message: userMessage.REFRESH_TOKEN_SUCCESS,
    result
  })
}
export const getAllUserController = async (
  req: Request<ParamsDictionary, any, any, PaginationReq>,
  res: Response,
  next: NextFunction
) => {
  const page = Number(req.query.page)
  const limit = Number(req.query.limit)
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await usersService.getAllUser({ user_id, page, limit })
  return res.json({
    message: userMessage.GET_LIST_USER_SUCCESS,
    result
  })
}
export const getUserMessageController = async (
  req: Request<ParamsDictionary, any, any, PaginationReq>,
  res: Response,
  next: NextFunction
) => {
  const page = Number(req.query.page)
  const limit = Number(req.query.limit)
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await usersService.getUserMessage({ user_id, page, limit })
  return res.json({
    message: userMessage.GET_LIST_USER_MESSAGE_SUCCESS,
    result
  })
}
export const getFollowerController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await usersService.getFollower(user_id)
  return res.json({
    message: userMessage.GET_FOLLOWER_MESSAGE_SUCCESS,
    result
  })
}

export const getFollowingController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await usersService.getFollowing(user_id)
  return res.json({
    message: userMessage.GET_FOLLOWING_MESSAGE_SUCCESS,
    result
  })
}

export const getSearchUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const searchTerm = (req.query.name as string) || ''
    const limit = Number(req.query.limit)

    // Gọi service để tìm kiếm người dùng
    const users = await usersService.getSearch({ searchTerm, limit })

    if (users.length === 0) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng'
      })
    }

    return res.status(200).json({
      message: 'Tìm kiếm thành công',
      results: users
    })
  } catch (error) {
    console.error('Lỗi khi tìm kiếm người dùng:', error)
    return res.status(500).json({
      message: 'Đã xảy ra lỗi khi tìm kiếm người dùng'
    })
  }
}
export const getUserController = async (req: Request, res: Response, next: NextFunction) => {
  const page = Number(req.query.page)
  const limit = Number(req.query.limit)
  const result = await usersService.getAllUserList(page, limit)
  return res.json({
    message: 'get All user success',
    result
  })
}

export const deleteUserController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { _id } = req.params
  await usersService.deleteUser(user_id, _id)
  return res.json({
    message: 'Delete user success'
  })
}
