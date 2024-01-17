import express from 'express';
import { auth } from 'express-openid-connect';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';
import keycloak from '../lib/keycloak.js';
import config from '../lib/config.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));


keycloak.initTls();

const app = express();

app.use(bodyParser.json());

// always set long hashes as secret:
// openssl rand -base64 512 | tr -d '\n'
// add policy to expire secret after one year.
app.post('/service-account/login', async (req, res) => {
  let loginResp = await keycloak.loginServiceAccount(
    req.body.username, req.body.secret
  );

  // strip id_token, don't have 3rd party users bother with this.
  if( loginResp.status === 200 ) {
    delete loginResp.body.id_token;
  }

  res
    .status(loginResp.status)
    .json(loginResp.body);
});

app.use(auth({
  issuerBaseURL: config.oidc.baseUrl,
  baseURL: config.service.url,
  clientID: config.oidc.clientId,
  clientSecret: config.oidc.secret,
  secret : config.jwt.secret,
  routes : {
    callback : '/callback',
    login : false,
    logout : '/logout',
    postLogoutRedirect : '/postLogoutRedirect'
  },
  authorizationParams: {
    response_type: 'code',
    scope : config.oidc.scopes
  },
  idpLogout: true,
  // afterCallback : (req, res, session, decodedState) => {
  //   console.log(req.query);
  //   res.set('PG-FARM-AUTHORIZED-TOKEN', session.access_token);
  //   return session
  // }
}));

app.get('/login', (req, res) => { 
  res.oidc.login({ 
    returnTo: '/success'+(req.query.redirect ? '?redirect='+req.query.redirect : '')
  });
});

app.get('/success', async (req, res) => { 
  let jwt = req.oidc.accessToken.access_token;
  if( req.query.redirect ) {
    res.redirect(req.query.redirect+'?jwt='+jwt);
    return;
  }

  let html = await fs.readFile(path.join(__dirname, 'headless.html'), 'utf8');4
  html = html.replace('{{JWT_TOKEN}}', jwt);

  res.set('Content-Type', 'text/html');
  res.send(html);
});

app.listen(config.service.port, () => {
  console.log('oidc service listening on port '+config.service.port);
});