import { Router } from 'express'
import {
  changepasswordController,
  deleteUserController,
  emailVerifyController,
  followController,
  forgotPasswordController,
  getAllUserController,
  getFollowerController,
  getFollowingController,
  getMeController,
  getSearchUsersController,
  getUserController,
  getUserMessageController,
  getUserProfileController,
  loginController,
  logoutController,
  oauthController,
  refreshTokenController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  unFollowController,
  updateMeController,
  verifyForgotPasswordController
} from '~/controllers/users.controllers'
import { filterMiddleware } from '~/middlewares/common.middleware'
import { paginateValidator } from '~/middlewares/tweets.middleware'
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  followValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  unfollowValidator,
  updateMeValidator,
  verifiedUserValidator,
  verifyForgotPasswordTokenValidator
} from '~/middlewares/users.middleware'
import { UpdateMeReqBody } from '~/models/requests/User.requests'
import { wrapRequestHandler } from '~/utils/handlers'
export const usersRouter = Router()

usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController))
usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController))
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController))
usersRouter.post('/verify-email', emailVerifyTokenValidator, wrapRequestHandler(emailVerifyController))
usersRouter.post('/resend-verify-email', accessTokenValidator, wrapRequestHandler(resendVerifyEmailController))
usersRouter.post('/forgot-password', forgotPasswordValidator, wrapRequestHandler(forgotPasswordController))
usersRouter.post(
  '/verify-forgot-password-token',
  verifyForgotPasswordTokenValidator,
  wrapRequestHandler(verifyForgotPasswordController)
)
usersRouter.post('/reset-password', resetPasswordValidator, wrapRequestHandler(resetPasswordController))
usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMeController))
usersRouter.get('/:user_id', accessTokenValidator, wrapRequestHandler(getUserProfileController))

usersRouter.put(
  '/me',
  accessTokenValidator,
  verifiedUserValidator,
  updateMeValidator,
  filterMiddleware<UpdateMeReqBody>([
    'name',
    'data_of_birth',
    'bio',
    'location',
    'website',
    'username',
    'avatar',
    'cover_photo'
  ]),
  wrapRequestHandler(updateMeController)
)
usersRouter.post(
  '/follow',
  accessTokenValidator,
  verifiedUserValidator,
  followValidator,
  wrapRequestHandler(followController)
)
usersRouter.delete(
  '/unfollow/:user_id',
  accessTokenValidator,
  verifiedUserValidator,
  unfollowValidator,
  wrapRequestHandler(unFollowController)
)
usersRouter.put(
  '/change-password',
  accessTokenValidator,
  changePasswordValidator,
  wrapRequestHandler(changepasswordController)
)
usersRouter.get('/oauth/google', wrapRequestHandler(oauthController))
usersRouter.post('/refresh-token', refreshTokenValidator, wrapRequestHandler(refreshTokenController))
usersRouter.get('/list/tofollow', accessTokenValidator, verifiedUserValidator, wrapRequestHandler(getAllUserController))
usersRouter.get(
  '/message/list',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getUserMessageController)
)
usersRouter.get(
  '/follower/list',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getFollowerController)
)
usersRouter.get(
  '/following/list',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getFollowingController)
)
usersRouter.get(
  '/api/search',
  accessTokenValidator,
  // paginateValidator,
  verifiedUserValidator,
  wrapRequestHandler(getSearchUsersController)
)
usersRouter.get(
  '/dashboard/account/list',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getUserController)
)
usersRouter.delete('/:_id', accessTokenValidator, verifiedUserValidator, wrapRequestHandler(deleteUserController))
