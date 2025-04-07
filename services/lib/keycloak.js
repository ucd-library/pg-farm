import fetch from 'node-fetch';
import clone from 'clone';
import config from './config.js';
import adminClient from './pg-admin-client.js';
import { organization } from '../models/index.js';
import logger from './logger.js';

class KeycloakUtils {

  constructor() {
    this.tokenCache = new Map();
    this.tokenRequestCache = new Map();
    this.tokenCacheTTL = config.oidc.tokenCacheTTL;

    this.setUser = this.setUser.bind(this);
    this.protect = this.protect.bind(this);
  }

  initTls() {
    if( this.tlsInitialized ) return;
    this.tlsInitialized = true;

    // hack for self signed cert for now...
    if( process.env.LOCAL_KEYCLOAK === 'true' ) {
      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
    }
  }

  async getJWKS() {
    this.initTls();

    if( this.jwks ) {
      return this.jwks;
    }

    let resp = await fetch(config.oidc.baseUrl+'/protocol/openid-connect/certs')
    this.jwks = await resp.json();

    setTimeout(() => this.jwks = null, 1000 * 60 * 60);

    return this.jwks;
  }

  async loginServiceAccount(username, secret) {
    this.initTls();

    let apiResp = await fetch(config.oidc.baseUrl+'/protocol/openid-connect/token', {
      method: 'POST',
      headers:{
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type : 'password',
        client_id : config.oidc.clientId,
        client_secret : config.oidc.secret,
        username : username,
        password : secret,
        scope : config.oidc.scopes
      })
    });

    let json = await apiResp.json();

    return {
      body : json,
      status : apiResp.status
    }
  }

  async verifyActiveToken(token='') {
    this.initTls();

    token = token.replace(/^Bearer /i, '');

    if( token.match(/^urn:/) ) {
      token = await adminClient.getUserTokenFromHash(token);
      if( !token ) {
        return {
          active : false,
          status : 404,
          user : null,
          error : true,
          message : 'Token not found from hash'
        }
      }
    }

    // 30 second caching
    if( this.tokenCache.has(token) ) {
      let result = this.tokenCache.get(token);
      return clone(result);
    }

    let resp = {};
    let requestResolve;
    let requestReject;

    try {
      let result;

      // if we get multiple requests at once, just make one
      // request to the auth server
      if( this.tokenRequestCache.has(token) ) {
        let promise = this.tokenRequestCache.get(token);
        result = await promise;

        return clone(result);
      }

      // short abort
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      let request = fetch(config.oidc.baseUrl+'/protocol/openid-connect/userinfo', {
        signal: controller.signal,
        headers : {
          authorization : 'Bearer '+token
        }
      });


      let promise = new Promise((resolve, reject) => {
        requestResolve = resolve;
        requestReject = reject;
      });
      this.tokenRequestCache.set(token, promise);

      let resp = await request;
      let body = await resp.text();
      clearTimeout(timeoutId);

      result = {
        active : resp.status === 200,
        status : resp.status,
        user : body ? JSON.parse(body) : null
      }

      this.tokenCache.set(token, result);
      setTimeout(() => {
        this.tokenCache.delete(token);
      }, this.tokenCacheTTL);


      requestResolve(result);
      this.tokenRequestCache.delete(token);

      return clone(result);
    } catch(e) {
      if( requestReject ){
        requestReject(e);
      }
      this.tokenRequestCache.delete(token);

      if (e.name === 'AbortError' || e.name === 'FetchError') {
        logger.warn('Failed to verify jwt from keycloak, attempting pub key decryption', e)
        let user = await jwt.validate(token);
        if( user ) {
          return {
            active : true,
            status : 200,
            fallback : true,
            user : clone(user)
          }
        }
      }

      return {
        active : resp.status === 200,
        status : resp.status,
        user : null,
        error : true,
        message : e.message
      }
    }
  }

  /**
   * @method getJwtFromRequest
   * @description given a express request object, return a given jwt token.
   * Method will first check the request cookies of the jwt token cookie then
   * checks the Authorization header of the token.
   *
   * @param {Object} req express request object
   *
   * @returns {String|null} null if no token found.
   */
  getJwtFromRequest(req) {
    let token;

    if( req.cookies ) {
      token = req.cookies[config.jwt.cookieName];
      if( token ) return token;
    }

    token = req.get('Authorization');
    if( token && token.match(/^Bearer /i) ) {
      return token.replace(/^Bearer /i, '');
    }

    return null;
  }

  async setUser(req, res, next) {
    // TODO: ensure x- headers are stripped first
    // if( req.headers[config.jwt.header] ) {
    //   req.user = JSON.parse(req.headers[config.jwt.header]);
    //   if( !req.user.roles ) req.user.roles = [];

    //   return next();
    // }

    if( req.user ) {
      return next();
    }

    let token = this.getJwtFromRequest(req);
    if( !token ) return next();

    let resp = await this.verifyActiveToken(token);

    if( resp.active !== true ) return next();
    let user = resp.user;

    req.user = user;

    // override roles
    let roles = new Set();

    if( !user.username && user.preferred_username ) {
      user.username = user.preferred_username;
    }

    if( user.username ) roles.add(user.username);
    if( user.preferred_username ) roles.add(user.preferred_username);

    if( user.roles && Array.isArray(user.roles) ) {
      user.roles.forEach(role => roles.add(role));
    }

    if( user.realmRoles && Array.isArray(user.realmRoles) ) {
      user.realmRoles.forEach(role => roles.add(role));
      delete user.realmRoles;
    }

    // check for the instance name in the request. add role name if found
    let instName = req.params.instance;
    let orgName = req.params.organization;
    let dbName = req.params.database;

    if( (instName || dbName) && orgName ) {
      try {
        let resp = await adminClient.getUser(instName || dbName, user.username);
        roles.add(resp.instance_name+'-'+resp.type.toLowerCase());
        if( !req.params.instance ) req.params.instance = resp.instance_name;
      } catch(e) {}
    }

    user.roles = Array.from(roles)
      .filter(role => config.oidc.roleIgnoreList.includes(role) === false);

    req.headers[config.jwt.header] = JSON.stringify(user);

    next();
  }

  protect(roles=[]) {
    if( !Array.isArray(roles) ) {
      roles = [roles];
    }

    let authorize = function (req, res, next)  {
      this.setUser(req, res, () => {

        let reqRoles = roles;

        if( roles.includes('instance-admin') ) {
          return this._protectInstance(req, res, next, ['ADMIN']);
        }

        if( roles.includes('organization-admin') ) {
          return this._protectOrganization(req, res, next, ['ADMIN']);
        }

        if( roles.includes('admin') ) {
          return this._protectInstance(req, res, next, reqRoles);
        }

        // no user
        if( roles.includes('logged-in') ) {
          if( !req.user ) return res.status(403).send('Unauthorized');
          return next();
        }

        return res.status(403).send('Unknown protection: '+roles.join(', '));
      })
    };

    authorize = authorize.bind(this);
    return authorize;
  }

  _protectAdmin(req, res, next) {
    if( !req.user ) return res.status(403).send('Unauthorized');

    if( req.user.roles.includes('admin') ) {
      return next();
    }

    return res.status(403).send('Unauthorized');
  }

  async _protectOrganization(req, res, next, types=['ADMIN']) {
    if( !req.user ) return res.status(403).send('Unauthorized');

    if( req.user.roles.includes('admin') ) {
      return next();
    }

    let organization = req.params.organization;

    try {
      let orgUser = await adminClient.getOrganizationUser(req.user.username, organization);
      if( types.includes(orgUser?.user_type))  {
        return next();
      }
    } catch(e) {
      // todo; silence is golden?
    }

    return res.status(403).send('Unauthorized');
  }

 async  _protectInstance(req, res, next, types=['ADMIN']) {
    if( !req.user ) return res.status(403).send('Unauthorized');

    if( req.user.roles.includes('admin') ) {
      return next();
    }

    let nameOrId = req.params.instance || req.params.database;
    let organization = req.params.organization;
    if( organization === '_' ) organization = null;

    try {
      let instUser = await adminClient.getInstanceUser(nameOrId, organization, req.user.username);
      if( types.includes(instUser?.user_type))  {
        return next();
      }
    } catch(e) {
      // todo; silence is golden?
    }

    return res.status(403).send('Unauthorized');
  }

}

const instance = new KeycloakUtils();
export default instance;
