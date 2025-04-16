/**
 * @description Isomorphic class for accessing grant/privilege/role definitions
 */
class GrantDefinitions {

  constructor() {

    this.roleLabels = {
      'READ': 'Viewer',
      'WRITE': 'Editor',
      'NONE': 'No Access'
    }

    // map of object to action to grant to role
    this.registry = [
      {object: 'DATABASE', action: 'READ', grant: ['CONNECT'], roleLabel: this.roleLabels.READ},
      {object: 'DATABASE', action: 'WRITE', grant: ['CREATE', 'TEMPORARY'], roleLabel: this.roleLabels.WRITE},
      {object: 'SCHEMA', action: 'READ', grant: ['USAGE'], roleLabel: this.roleLabels.READ},
      {object: 'SCHEMA', action: 'WRITE', grant: ['CREATE'], roleLabel: this.roleLabels.WRITE},
      {object: 'TABLE', action: 'READ', grant: ['SELECT'], roleLabel: this.roleLabels.READ},
      {object: 'TABLE', action: 'WRITE', grant: ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'], roleLabel: this.roleLabels.WRITE},
      {object: 'FUNCTION', action: 'EXECUTE', grant: ['EXECUTE'], roleLabel: 'EXECUTE'},
      {object: 'SEQUENCE', action: 'READ', grant: ['SELECT'], roleLabel: this.roleLabels.READ},
      {object: 'SEQUENCE', action: 'WRITE', grant: ['UPDATE', 'USAGE'], roleLabel: this.roleLabels.WRITE},
      {object: 'TYPE', action: 'WRITE', grant: ['USAGE'], roleLabel: this.roleLabels.WRITE}
    ];

    this.GRANTS = this.registry.reduce((acc, grant) => {
      acc[grant.object] = acc[grant.object] || {};
      acc[grant.object][grant.action] = grant.grant;
      return acc;
    }, {});
  }

  /**
   * @description Get the grant object for a given object and user/privileges
   * @param {String} object - The object type (e.g. DATABASE, SCHEMA, TABLE, FUNCTION, SEQUENCE, TYPE)
   * @param {Object|Array} userOrPrivs - The user object or array of privileges
   * @returns {Object} - The grant object from the registry
   */
  getGrant(object, userOrPrivs){
    const actions = ['EXECUTE', 'WRITE', 'READ'];
    for ( let action of actions ) {
      const grant = this.registry.find(grant => grant.object === object && grant.action === action);
      if ( !grant?.grant?.length ) continue;
      const firstPriv = grant.grant[0];
      if ( userOrPrivs?.pgPrivileges?.includes?.(firstPriv) ) {
        return JSON.parse(JSON.stringify(grant));
      } else if ( userOrPrivs?.includes?.(firstPriv) ) {
        return JSON.parse(JSON.stringify(grant));
      }
    }
    return this.getNoAccessGrant(object);
  }

  getRoleLabel(object, userOrPrivs) {
    const grant = this.getGrant(object, userOrPrivs);
    return grant.roleLabel;
  }

  /**
   * @description Get the grant object for no access
   * @param {String} object - The object type (e.g. DATABASE, SCHEMA, TABLE, FUNCTION, SEQUENCE, TYPE)
   * @returns {Object} - The grant object for no access
   */
  getNoAccessGrant(object) {
    return {object, action: 'NONE', grant: [], roleLabel: this.roleLabels.NONE};
  }

  /**
   * @description Get all grant types for a given object
   * @param {String} object - The object type (e.g. DATABASE, SCHEMA, TABLE, FUNCTION, SEQUENCE, TYPE)
   * @param {Boolean} excludeNoAccess - Exclude the no access grant
   * @returns {Array}
   */
  getObjectGrants(object, excludeNoAccess) {
    let grants = this.registry.filter(grant => grant.object === object).map(grant => {return {...grant}});
    if ( !excludeNoAccess ) {
      grants.push(this.getNoAccessGrant(object));
    }
    return grants
  }
}

export default new GrantDefinitions();
