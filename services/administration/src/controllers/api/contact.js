import {Router} from 'express';
import fetch from "node-fetch";
import handleError from '../handle-errors.js';
import config from '../../../../lib/config.js';
import smtp from '../../../../lib/smtp.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    let input = Object.assign({}, req.query, req.body);

    // Validate input
    const requiredFields = ['contactName', 'contactEmail', 'projectDescription'];
    const missingFields = requiredFields.filter(field => !input[field]?.length);
    if ( missingFields.length ) {
      return res.status(400).json({
        message : 'Submission failed',
        details : {validationFailed: true, missingFields}
      });
    }

    // verify submission with recaptcha
    const recaptchaToken = input._recaptchaToken;
    delete input._recaptchaToken;
    if ( !config.client.recaptcha.disabled ){
      let recaptchaResp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `secret=${config.client.recaptcha.secretKey}&response=${recaptchaToken}`
      });
      recaptchaResp = await recaptchaResp.json();
      if( !recaptchaResp.success ) {
        return res.status(400).json({
          message : 'Recaptcha failed',
          details : {recaptchaFailed: true}
        });
      }
    }

    // Send email
    let html = smtp.objToHtml(input);
    let emailOpts = {
      subject: 'PG Farm Contact Form Submission',
      html
    };
    const r = await smtp.sendMailToAdmin(emailOpts);
    if ( !r.success ){
      return handleError(res, r.error);
    }
    res.status(200).json({success: true});

  } catch(e) {
    handleError(res, e);
  }

});

export default router;
