import { Request, Response } from 'express'
import { getReceiverReqParams } from '~/models/requests/Conversation.requests'
import { ParamsDictionary } from 'express-serve-static-core'

import conversationServices from '~/services/conversation.services'

export const getConversationsController = async (
  req: Request<ParamsDictionary, any, getReceiverReqParams>,
  res: Response
) => {
  const { receiver_id } = req.params
  const sender_id = req.decoded_authorization?.user_id as string
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)

  const result = await conversationServices.getConversation({ sender_id, receiver_id, limit, page })
  return res.json({
    result: {
      limit,
      page,
      total_page: Math.ceil(result.total / limit),
      conversations: result.result
    },
    message: 'get conversation successfully'
  })
}
