import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function email(to: string, body: string,from:string,subject:string){
await resend.emails.send({
  from:from,
  to: to,
  subject: subject,
  html:`<div style="white-space: pre-wrap;">${body}</div>`
});
}