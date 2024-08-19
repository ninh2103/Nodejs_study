import { ParamSchema, body, checkSchema } from 'express-validator'
import { JsonWebTokenError } from 'jsonwebtoken'
import { HTTP_STATUS } from '~/constants/httpStatus'
import { userMessage } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/errors'
import databaseService from '~/services/database.services'
import { hashPassword } from '~/utils/crypto'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'
import { NextFunction, Request, Response } from 'express'
import { ObjectId } from 'mongodb'
import { TokenPayload } from '~/models/requests/User.requests'
import { UserVerifyStatus } from '~/constants/enums'
import { REGEX_USER } from '~/constants/regex'
import usersService from '~/services/users.services'
const passwordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: userMessage.PASSWORD_IS_REQUIRED
  },
  isLength: {
    options: {
      min: 6,
      max: 50
    },
    errorMessage: userMessage.PASSWORD_LENGTH_BE_AT_LEAST_1_CHARACTERS_LONG
  },
  isStrongPassword: {
    options: {
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    }
  },
  errorMessage: userMessage.PASSWORD_IS_STRONG
}
const comfirmPasswordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: userMessage.COMFIRM_PASSWORD_IS_REQUIRED
  },
  isLength: {
    options: {
      min: 6,
      max: 50
    },
    errorMessage: userMessage.CONFIRM_PASSWORD_LENGTH_BE_AT_LEAST_1_CHARACTERS_LONG
  },
  isStrongPassword: {
    options: {
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    },
    errorMessage: userMessage.COMFIRM_PASSWORD_IS_STRONG
  },
  custom: {
    options: (value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(userMessage.COMFIRM_PASSWORD_NOT_MATCH)
      }
      return true
    }
  }
}
const forgotPasswordToken: ParamSchema = {
  trim: true,
  custom: {
    options: async (value: string, { req }) => {
      if (!value) {
        throw new ErrorWithStatus({
          message: userMessage.FORGOT_PASSWORD_TOKEN_IS_REQUIRED,
          status: HTTP_STATUS.UNAUTHORIZED
        })
      }
      try {
        const decoded_forgot_password_token = await verifyToken({
          token: value,
          secretOrPublicKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
        })
        const { user_id } = decoded_forgot_password_token
        const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })

        if (user === null) {
          throw new ErrorWithStatus({
            message: userMessage.USER_NOTFOUND,
            status: HTTP_STATUS.UNAUTHORIZED
          })
        }
        if (user.forgot_password_token !== value) {
          throw new ErrorWithStatus({
            message: userMessage.FORGOT_PASSWORD_TOKEN_INVALID,
            status: HTTP_STATUS.UNAUTHORIZED
          })
        }
        req.decoded_forgot_password_token = decoded_forgot_password_token
      } catch (error) {
        if (error instanceof JsonWebTokenError) {
          throw new ErrorWithStatus({
            message: error.message,
            status: HTTP_STATUS.UNAUTHORIZED
          })
        }
        throw error
      }
      return true
    }
  }
}
const nameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: userMessage.NAME_IS_REQUIRED
  },
  isString: {
    errorMessage: userMessage.NAME_MUST_BE_A_STRING
  },
  isLength: {
    options: {
      min: 1,
      max: 100
    },
    errorMessage: userMessage.NAME_MUST_BE_AT_LEAST_1_CHARACTERS_LONG
  },
  trim: true
}
const dataofbirthSchema: ParamSchema = {
  isISO8601: {
    options: {
      strict: true,
      strictSeparator: true
    },
    errorMessage: userMessage.DATA_OF_BIRTH_MUST_BE_ISO8601
  }
}
const userIdSchema: ParamSchema = {
  custom: {
    options: async (value: string, { req }) => {
      if (!ObjectId.isValid(value)) {
        throw new ErrorWithStatus({
          message: userMessage.INVALID_USER_ID,
          status: HTTP_STATUS.NOT_FOUND
        })
      }
      const followed_user = await databaseService.users.findOne({
        _id: new ObjectId(value)
      })
      if (followed_user === null) {
        throw new ErrorWithStatus({
          message: userMessage.USER_NOTFOUND,
          status: HTTP_STATUS.NOT_FOUND
        })
      }
    }
  }
}

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: userMessage.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: userMessage.EMAIL_IS_INVALID
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            const user = await databaseService.users.findOne({
              email: value,
              password: hashPassword(req.body.password)
            })
            if (user === null) {
              throw new Error(userMessage.USER_NOTFOUND)
            }
            req.user = user

            return true
          }
        }
      },
      password: {
        notEmpty: {
          errorMessage: userMessage.PASSWORD_IS_REQUIRED
        },
        isLength: {
          options: {
            min: 6,
            max: 50
          },
          errorMessage: userMessage.PASSWORD_LENGTH_BE_AT_LEAST_1_CHARACTERS_LONG
        },
        isStrongPassword: {
          options: {
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
          }
        },
        errorMessage: userMessage.PASSWORD_IS_STRONG
      }
    },
    ['body']
  )
)
export const registerValidator = validate(
  checkSchema(
    {
      name: nameSchema,
      email: {
        notEmpty: {
          errorMessage: userMessage.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: userMessage.EMAIL_IS_INVALID
        },
        trim: true,
        custom: {
          options: async (value) => {
            const exitEmail = await usersService.checkEmail(value)
            if (exitEmail) {
              throw new Error(userMessage.EMAIL_ALREADY_EXISTS)
            }
            return true
          }
        }
      },
      password: passwordSchema,
      comfim_password: comfirmPasswordSchema,
      date_of_birth: dataofbirthSchema
    },
    ['body']
  )
)

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        custom: {
          options: async (value: string, { req }) => {
            const access_token = (value || '').split(' ')[1]
            if (!access_token) {
              throw new ErrorWithStatus({ message: userMessage.ACCESS_IS_REQUIRED, status: HTTP_STATUS.UNAUTHORIZED })
            }
            try {
              const decoded_authorization = await verifyToken({
                token: access_token,
                secretOrPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
              })
              ;(req as Request).decoded_authorization = decoded_authorization
            } catch (error) {
              throw new ErrorWithStatus({
                message: (error as JsonWebTokenError).message,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            return true
          }
        }
      }
    },
    ['headers']
  )
)
export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: userMessage.REFRESH_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            try {
              const [decoded_refresh_token, refresh_token] = await Promise.all([
                verifyToken({ token: value, secretOrPublicKey: process.env.JWT_SECRET_REFRESH_TOKEN as string }),
                databaseService.refreshTokens.findOne({ token: value })
              ])
              if (refresh_token === null) {
                throw new ErrorWithStatus({
                  message: userMessage.USER_REFRESH_TOKEN_OR_NOT_EXITS,
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              ;(req as Request).decoded_refresh_token = decoded_refresh_token
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: error.message,
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              throw error
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: userMessage.EMAIL_VERIFY_TOKEN_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            try {
              const decoded_email_verify_token = await verifyToken({
                token: value,
                secretOrPublicKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              })
              ;(req as Request).decoded_email_verify_token = decoded_email_verify_token
              return true
            } catch (error) {
              throw new ErrorWithStatus({
                message: (error as JsonWebTokenError).message,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
          }
        }
      }
    },

    ['body']
  )
)
export const forgotPasswordValidator = validate(
  checkSchema(
    {
      email: {
        isEmail: {
          errorMessage: userMessage.EMAIL_IS_INVALID
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            const user1 = await databaseService.users.findOne({
              email: value
            })
            if (user1 === null) {
              throw new Error(userMessage.USER_NOTFOUND)
            }
            ;(req as Request).user = user1
            return true
          }
        }
      }
    },
    ['body']
  )
)
export const verifyForgotPasswordTokenValidator = validate(
  checkSchema(
    {
      forgot_password_token: forgotPasswordToken
    },
    ['body']
  )
)
export const resetPasswordValidator = validate(
  checkSchema(
    {
      password: passwordSchema,
      comfirm_password: comfirmPasswordSchema,
      forgot_password_token: forgotPasswordToken
    },
    ['body']
  )
)
export const verifiedUserValidator = (req: Request, res: Response, next: NextFunction) => {
  const { verify } = req.decoded_authorization as TokenPayload
  if (verify !== UserVerifyStatus.Verified) {
    throw next(
      new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: userMessage.USER_NOT_VERIFY
      })
    )
  }
  next()
}

export const updateMeValidator = validate(
  checkSchema(
    {
      name: { ...nameSchema, notEmpty: undefined, optional: true },
      dataofbirthSchema: {
        ...dataofbirthSchema,
        optional: true
      },
      bio: {
        optional: true,
        isString: {
          errorMessage: userMessage.BIO_MUST_BE_STRING
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: userMessage.BIO_LENGTH
        }
      },
      location: {
        optional: true,
        isString: {
          errorMessage: userMessage.LOCATION_LENGTH
        },
        trim: true,

        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: userMessage.BIO_LENGTH
        }
      },
      website: {
        optional: true,
        isString: {
          errorMessage: userMessage.LOCATION_LENGTH
        },
        trim: true,

        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: userMessage.WEBSITE_LENGTH
        }
      },
      username: {
        optional: true,

        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!REGEX_USER.test(value)) {
              throw Error(userMessage.USERNAME_INVALID)
            }
            const user = await databaseService.users.findOne({
              username: value
            })
            if (user) {
              throw Error(userMessage.USERNAME_EXITS)
            }
          }
        }
      },
      avatar: {
        optional: true,
        isString: {
          errorMessage: userMessage.LOCATION_LENGTH
        },
        trim: true,

        isLength: {
          options: {
            min: 1,
            max: 50
          },
          errorMessage: userMessage.AVATAR_LENGTH
        }
      },
      cover_photo: {
        optional: true,
        isString: {
          errorMessage: userMessage.LOCATION_LENGTH
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 50
          },
          errorMessage: userMessage.COVER_PHOTO_LENGTH
        }
      }
    },

    ['body']
  )
)
export const followValidator = validate(
  checkSchema(
    {
      followed_user_id: userIdSchema
    },
    ['body']
  )
)

export const getConversationsValidator = validate(
  checkSchema(
    {
      receiver_id: userIdSchema
    },
    ['params']
  )
)

export const unfollowValidator = validate(checkSchema({ user_id: userIdSchema }, ['params']))
export const changePasswordValidator = validate(
  checkSchema(
    {
      old_password: {
        ...passwordSchema,
        custom: {
          options: async (value: string, { req }) => {
            const { user_id } = (req as Request).decoded_authorization as TokenPayload
            const user = await databaseService.users.findOne({
              _id: new ObjectId(user_id)
            })
            if (!user) {
              throw new ErrorWithStatus({
                message: userMessage.USER_NOTFOUND,
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            const { password } = user
            const isMatch = hashPassword(value) === password
            if (!isMatch) {
              throw new ErrorWithStatus({
                message: userMessage.OLD_PASSWORD_NOT_MATCH,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
          }
        }
      },
      password: passwordSchema,
      comfirmpassword: comfirmPasswordSchema
    },
    ['body']
  )
)
