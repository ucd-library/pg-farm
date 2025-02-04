import spaMiddleware from '@ucd-lib/spa-router-middleware';
import express from 'express';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';
import pgInstClient from '../../lib/pg-instance-client.js';
import loaderHtml from '../html/loader.html.mjs';
import path from 'path';
import clone from 'clone';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

let assetsDir = path.join(__dirname, '..', config.client.assets);
logger.info('CLIENT_ENV='+config.client.env+', Serving static assets from '+assetsDir);

let src = path.join('/', 'js', 'bundle.js');

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
        jsonld, src,
        title : config.client.title,
        loader: loaderHtml,
        description : '',
        keywords : ''
      });
    }
  });

  /**
   * Setup static asset dir
   */
  app.use(express.static(assetsDir, {
    immutable: true,
    maxAge: '1y'
  }));
}

export default setup;
