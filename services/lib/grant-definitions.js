/**
 * @description Isomorphic class for accessing grant definitions
 */
class GrantDefinitions {

  constructor() {

    this.roleLabels = {
      'READ': 'Viewer',
      'WRITE': 'Editor'
    }

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
}

export default new GrantDefinitions();
