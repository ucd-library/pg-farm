import spaMiddleware from '@ucd-lib/spa-router-middleware';
import express from 'express';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';
import pgInstClient from '../../lib/pg-instance-client.js';
import loaderHtml from '../dev/loader.html.mjs';
import path from 'path';

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
      let user = req.user;

      if( user ) {
        if( !user.roles ) user.roles = [];
        if( user.roles.includes('admin') ) user.admin = true;
        user.loggedIn = true;
      } else {
        user = {loggedIn: false};
      }

      next({
        user,
        appRoutes : config.client.appRoutes,
        env : config.client.env,
        grants : pgInstClient.GRANTS,
        logger : config.client.logger,
        buildInfo: config.client.buildInfo
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
