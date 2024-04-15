import { auth } from 'express-openid-connect';
import fs from 'fs/promises';
import path from 'path';
import keycloak from '../../../../lib/keycloak.js';
import config from '../../../../lib/config.js';
import pgAdminClient from '../../../../lib/pg-admin-client.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

keycloak.initTls();


function register(app) {

  // always set long hashes as secret:
  // openssl rand -base64 512 | tr -d '\n'
  // add policy to expire secret after one year.
  app.post('/auth/service-account/login', async (req, res) => {
    let loginResp = await keycloak.loginServiceAccount(
      req.body.username, req.body.secret
    );

    // strip id_token, don't have 3rd party users bother with this.
    if( loginResp.status === 200 ) {
      delete loginResp.body.id_token;
    }

    await pgAdminClient.setUserToken(loginResp.body.access_token);

    res
      .status(loginResp.status)
      .json(loginResp.body);
  });

  app.use(auth({
    issuerBaseURL: config.oidc.baseUrl,
    baseURL: config.appUrl,
    clientID: config.oidc.clientId,
    clientSecret: config.oidc.secret,
    secret : config.jwt.secret,
    routes : {
      callback : '/auth/callback',
      login : false,
      logout : '/auth/logout',
      postLogoutRedirect : '/auth/postLogoutRedirect'
    },
    authorizationParams: {
      response_type: 'code',
      scope : config.oidc.scopes
    },
    idpLogout: true,
    authRequired: false
  }));

  app.get('/login', (req, res) => { 
    res.oidc.login({ 
      returnTo: '/auth/success'+(req.query.redirect ? '?redirect='+req.query.redirect : '')
    });
  });

  app.get('/auth/success', async (req, res) => { 
    let jwt = req.oidc.accessToken.access_token;

    await pgAdminClient.setUserToken(jwt);

    res.set('PG-FARM-AUTHORIZED-TOKEN', jwt);

    if( req.query.redirect ) {
      res.redirect(req.query.redirect+'?jwt='+jwt);
      return;
    }

    let html = await fs.readFile(path.join(__dirname, 'headless.html'), 'utf8');4
    html = html.replace('{{JWT_TOKEN}}', jwt);

    res.set('Content-Type', 'text/html');
    res.send(html);
  });

}

export default {
  register
}