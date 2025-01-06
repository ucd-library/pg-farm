import express from 'express';
import path from 'path';
import fs from 'fs';
import spaMiddleware from '@ucd-lib/spa-router-middleware'
import config from '../lib/config.js';
import logger from '../lib/logger.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'client', 'public');

let packageDef = fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8');
packageDef = JSON.parse(packageDef);
let loaderVersion = packageDef.dependencies['@ucd-lib/cork-app-load'].replace('^\D', '');
let assetsDir = path.join(__dirname, '..', 'client', config.client.assets);
let loaderPath = path.join(assetsDir, 'loader', 'loader.js');
let loaderSrc = fs.readFileSync(loaderPath, 'utf-8');

const bundle = `
  <script>
    var CORK_LOADER_VERSIONS = {
      loader : '${loaderVersion}',
      bundle : '${packageDef.version}'
    }
  </script>
  <script>${loaderSrc}</script>`;

module.exports = async (app) => {
  logger.info('CLIENT_ENV='+config.client.env+', Serving static assets from '+assetsDir);

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
        env : config.client.env
      });
    },
    template : async (req, res, next) => {
      let jsonld = '';

      return next({
        jsonld, bundle,
        title : config.client.title
        // description : record.description || '',
        // keywords : keywords.join(', ')
      })
  });
}
