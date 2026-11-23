/**
 * @description Pure helpers for summarizing the privileges a role holds on tables/views.
 * Used to build the public user permission summary shown before disabling the
 * public user account.  No database access happens here so these are easy to unit test.
 */

const WRITE_PRIVILEGES = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'];
const READ_PRIVILEGES = ['SELECT'];

const RELKIND_TYPES = {
  r : 'TABLE',
  p : 'TABLE',
  v : 'VIEW',
  m : 'MATERIALIZED VIEW',
  f : 'FOREIGN TABLE'
};

/**
 * @function classifyAccess
 * @description Classify a list of postgres privileges into a simple access level.
 * WRITE if any of INSERT/UPDATE/DELETE/TRUNCATE, otherwise READ if SELECT,
 * otherwise OTHER (e.g. REFERENCES or TRIGGER only).
 *
 * @param {Array<String>} privileges postgres privilege names
 *
 * @returns {String} READ, WRITE or OTHER
 */
function classifyAccess(privileges=[]) {
  privileges = normalizePrivileges(privileges);
  if( privileges.some(p => WRITE_PRIVILEGES.includes(p)) ) return 'WRITE';
  if( privileges.some(p => READ_PRIVILEGES.includes(p)) ) return 'READ';
  return 'OTHER';
}

/**
 * @function normalizePrivileges
 * @description Normalize privileges returned from pg.  array_agg results may come back
 * as a js array or as a postgres array literal string, e.g. '{SELECT,INSERT}'.
 *
 * @param {Array<String>|String} privileges
 *
 * @returns {Array<String>}
 */
function normalizePrivileges(privileges) {
  if( !privileges ) return [];
  if( typeof privileges === 'string' ) {
    privileges = privileges.replace(/(^{|}$)/g, '').split(',').filter(p => p);
  }
  return privileges.map(p => String(p).toUpperCase());
}

/**
 * @function relkindToType
 * @description Convert a pg_class relkind to a human readable type
 *
 * @param {String} relkind
 *
 * @returns {String}
 */
function relkindToType(relkind) {
  return RELKIND_TYPES[relkind] || 'OTHER';
}

/**
 * @function summarizeDatabase
 * @description Summarize the direct privileges a role has in a single database
 *
 * @param {String} database database name
 * @param {Object} privs result of pgInstClient.getRoleDirectPrivileges()
 * @param {Array<Object>} privs.relations
 * @param {Array<Object>} privs.schemas
 * @param {Number} privs.defaultAclCount
 * @param {Array<String>} privs.databasePrivileges
 *
 * @returns {Object} {database, tables, schemas, databasePrivileges, defaultPrivilegeCount, counts}
 */
function summarizeDatabase(database, privs={}) {
  let tables = (privs.relations || []).map(row => {
    let privileges = normalizePrivileges(row.privileges);
    return {
      schema : row.schema_name,
      name : row.name,
      type : relkindToType(row.relkind),
      access : classifyAccess(privileges),
      columnLevel : row.column_level === true,
      privileges
    };
  });

  let schemas = (privs.schemas || []).map(row => ({
    name : row.schema_name,
    privileges : normalizePrivileges(row.privileges)
  }));

  return {
    database,
    tables,
    schemas,
    databasePrivileges : normalizePrivileges(privs.databasePrivileges),
    defaultPrivilegeCount : privs.defaultAclCount || 0,
    counts : {
      read : tables.filter(t => t.access === 'READ').length,
      write : tables.filter(t => t.access === 'WRITE').length,
      other : tables.filter(t => t.access === 'OTHER').length
    }
  };
}

/**
 * @function totalCounts
 * @description Sum the read/write/other counts across database summaries
 *
 * @param {Array<Object>} databases array of summarizeDatabase() results
 *
 * @returns {Object} {read, write, other}
 */
function totalCounts(databases=[]) {
  return databases.reduce((acc, db) => {
    acc.read += db.counts?.read || 0;
    acc.write += db.counts?.write || 0;
    acc.other += db.counts?.other || 0;
    return acc;
  }, {read: 0, write: 0, other: 0});
}

export {
  WRITE_PRIVILEGES,
  READ_PRIVILEGES,
  classifyAccess,
  normalizePrivileges,
  relkindToType,
  summarizeDatabase,
  totalCounts
};
