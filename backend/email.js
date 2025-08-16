import nodemailer from 'nodemailer';

export async function sendSummaryEmail({ smtp, from, toList, subject, html }) {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port),
    secure: String(smtp.secure) === 'true',
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  });

  const info = await transporter.sendMail({
    from,
    to: toList,
    subject,
    html
  });

  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}
