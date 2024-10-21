import nodemailer from 'nodemailer'
import { Transporter, SentMessageInfo } from 'nodemailer'
import { config } from 'dotenv'
import { getHtmlTemplate } from './emailTemplate'
config()

export const sendEmail = async (
  receiverEmail: string,
  name: string,
  emailVerifyToken: string,
  emailType: 'verify' | 'forgotPassword'
) => {
  const transporter: Transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  })
  console.log('Sending email to:', receiverEmail) // Kiểm tra giá trị của receiverEmail

  // async..await is not allowed in global scope, must use a wrapper
  async function main(): Promise<void> {
    try {
      // send mail with defined transport object
      const info: SentMessageInfo = await transporter.sendMail({
        from: '"Toi la" <nguyenducninh210303@gmail.com>', // sender address
        to: receiverEmail, // list of receivers
        subject: 'send Email', // Subject line
        text: 'Hello world?', // plain text body
        html: getHtmlTemplate(name, emailVerifyToken, emailType) // html body
      })
    } catch (error) {
      console.error('Error sending email:', error)
    }
  }

  main().catch(console.error)
}
