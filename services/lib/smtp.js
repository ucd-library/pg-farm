import nodemailer from 'nodemailer';
import config from './config.js';
import logger from './logger.js';

class Smtp {

  get transporter() {
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendMail(opts) {
    const out = {success: false};
    if ( !opts.from ) {
      opts.from = config.smtp.fromEmail;
    }
    try {
      await this.transporter.sendMail(opts);
      out.success = true;
    } catch(e) {
      logger.error('Error sending email', e);
      out.error = e;
    }
    return out;
  }

  async sendMailToAdmin(opts){
    opts.to = config.smtp.adminEmail;
    return this.sendMail(opts);
  }

  objToHtml(obj) {
    let html = '';
    for( let key in obj ) {
      html += `<strong>${key}</strong>: ${obj[key]}<br>`;
    }
    return html;
  }
}

export default new Smtp();

