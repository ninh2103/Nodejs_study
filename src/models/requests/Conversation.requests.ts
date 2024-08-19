import { ParamsDictionary } from 'express-serve-static-core'

export interface getReceiverReqParams extends ParamsDictionary {
  receiver_id: string
}
