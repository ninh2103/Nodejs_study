import { Request } from 'express'
import { getNameFromFullName, handleUploadImage, handleUploadVideo } from '~/utils/file'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { isProduction } from '~/constants/config'
import { MediaType } from '~/constants/enums'
import { Media } from '~/models/Others'
class MediasService {
  async handleUploadImage(req: Request) {
    const files = await handleUploadImage(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newName = getNameFromFullName(file.newFilename)
        const newPath = path.resolve(UPLOAD_IMAGE_DIR, `${newName}.jpg`)
        await sharp(file.filepath).jpeg().toFile(newPath)
        fs.unlinkSync(file.filepath)
        return {
          url: isProduction
            ? `$https://my-twitter-clone.com/medias/${newName}.jpg`
            : `http://localhost:4000/medias/${newName}.jpg`,
          type: MediaType.Image
        }
      })
    )
    return result
  }
  async handleUploadVideo(req: Request) {
    const files = await handleUploadVideo(req)
    const { newFilename } = files[0]
    return {
      url: isProduction
        ? `$https://my-twitter-clone.com/static/video/${newFilename}`
        : `http://localhost:4000/static/video/${newFilename}`,
      type: MediaType.video
    }
  }
}

const mediasService = new MediasService()
export default mediasService
