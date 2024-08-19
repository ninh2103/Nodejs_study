import { NextFunction, Request, Response } from 'express'
import path from 'path'
import { UPLOAD_VIDEO_DIR, UPLOAD_VIDEO_TEMP_DIR } from '~/constants/dir'
import { userMessage } from '~/constants/messages'
import mediasService from '~/services/medias.services'
export const uploadImageController = async (req: Request, res: Response, next: NextFunction) => {
  //const formidable = (await import('formidable')).default
  const url = await mediasService.handleUploadImage(req)
  return res.json({
    message: userMessage.UPLOAD_SUCCESSFULLY,
    result: url
  })
}
export const uploadVideoController = async (req: Request, res: Response, next: NextFunction) => {
  //const formidable = (await import('formidable')).default
  const url = await mediasService.handleUploadVideo(req)
  return res.json({
    message: userMessage.UPLOAD_SUCCESSFULLY,
    result: url
  })
}
// export const servingVideoController = async (req: Request, res: Response, next: NextFunction) => {
//   const { name } = req.params
//   return res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, name), (err) => {
//     if (err) {
//       res.status((err as any).status).send('Not Found')
//     }
//   })
// }
