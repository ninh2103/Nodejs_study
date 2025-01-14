import { JwtPayload } from 'jsonwebtoken'
import { Tokentype, UserVerifyStatus } from '~/constants/enums'
import { ParamsDictionary, Query } from 'express-serve-static-core'

export interface RegisterReqBody {
  name: string
  password: string
  email: string
  data_of_birth: string
  comfirm_password: string
}
export interface TokenPayload extends JwtPayload {
  user_id: string
  token_type: Tokentype
  verify: UserVerifyStatus
  exp: number
  iat: number
}
export interface LoginReqBody {
  email: string
  password: string
}
export interface RegisterReqBody {
  name: string
  email: string
  password: string
  comfirm_password: string
  data_of_birth: string
}
export interface ForgotPasswordReqBody {
  email: string
}
export interface ResetPasswordREqBody {
  password: string
  comfirm_password: string
  forgot_password_token: string
}
export interface VerifyForgotPasswordTokenReqBody {
  forgot_password_token: string
}
export interface UpdateMeReqBody {
  name?: string
  data_of_birth?: string
  bio?: string
  location?: string
  website?: string
  username?: string
  avatar?: string
  cover_photo?: string
}
export interface FollowReqBody {
  followed_user_id: string
}
export interface UnFollowReqParams extends ParamsDictionary {
  username: string
}
export interface ChangePasswordReqBody {
  old_password: string
  password: string
  comfirm_password: string
}
export interface RefreshTokenBodyReq {
  refresh_token: string
}
export interface UserParam extends Query {
  profile_user_id: string
}
