import spaMiddleware from '@ucd-lib/spa-router-middleware';
import express from 'express';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';
import pgInstClient from '../../lib/pg-instance-client.js';
import loaderHtml from '../html/loader.html.mjs';
import path from 'path';
import fs from 'fs';
import clone from 'clone';
import crypto from 'node:crypto';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

let assetsDir = path.join(__dirname, '..', config.client.assets);
let staticAssetsDir = path.join(__dirname, '..', 'static-assets');
logger.info('CLIENT_ENV='+config.client.env+', Serving static assets from '+assetsDir);
logger.info('CLIENT_ASSETS_BASE_URL='+config.client.assetsBaseUrl+', Serving assets from '+staticAssetsDir);

let jsBundleHash = '';
let src = path.join('/', 'js', 'bundle.js');
loadJsBundleHash(assetsDir);

async function setup(app) {

  /**
   * Setup SPA app routes
   */
  spaMiddleware({
    app: app,
    htmlFile : path.join(assetsDir, 'index.html'),
    isRoot : true,
    appRoutes : config.client.appRoutes,
    getConfig : async (req, res, next) => {
      let user;
      if( req.user ) {
        user = clone(req.user);
        user.loggedIn = true;
      } else {
        user = {loggedIn: false}
      }

      next({
        user,
        loginPath : config.oidc.loginPath,
        logoutPath : config.oidc.logoutPath,
        appRoutes : config.client.appRoutes,
        env : config.client.env,
        grants : pgInstClient.GRANTS,
        logger : config.client.logger,
        buildInfo: config.client.buildInfo,
        assetsBaseUrl: config.client.assetsBaseUrl,
        publicUser : {
          username: config.pgInstance.publicRole.username, 
          password: config.pgInstance.publicRole.password
        },
        swaggerUi : {
          basePath: config.swaggerUi.basePath,
          testingDomain: config.swaggerUi.testingDomain
        },
        recaptcha: {
          disabled: config.client.recaptcha.disabled,
          siteKey: config.client.recaptcha.siteKey
        }
      });
    },
    template : async (req, res, next) => {
      let jsonld = '';

      return next({
        jsonld, src, jsBundleHash,
        title : config.client.title,
        loader: loaderHtml,
        description : '',
        keywords : ''
      });
    }
  });

  /**
   * Docs for development
   */
  app.use('/static-assets', express.static(staticAssetsDir, {
    immutable: true
  }));

  /**
   * Setup static asset dir
   */
  app.use(express.static(assetsDir, {
    immutable: true,
    maxAge: '1y'
  }));
}

function loadJsBundleHash(assetsDir) {
  let hashFile = path.join(assetsDir, 'js', 'bundle.js');
  if( fs.existsSync(hashFile) ) {
    const fileBuffer = fs.readFileSync(hashFile);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    jsBundleHash = hashSum.digest('hex').toString().substring(0, 8);
    logger.info('Loaded js bundle hash: '+jsBundleHash);
  } else {
    setTimeout(() => {
      loadJsBundleHash(assetsDir);
    }, 5000);
  }
}


export default setup;
