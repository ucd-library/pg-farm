/**
 * @description Bundles are groups of pages that will be dynamically loaded
 * if a user requests that page.
 * The object key refers to the bundle file name (without the .js extension)
 * The array value is a list of page ids that are in that bundle.
 */
const defs = {
  public : [
    'home', 'features', 'contact', 'search', 'org', 'db', 'org-single'
  ],
  admin: [
    'admin-db-overview', 'admin-db-users', 'admin-db-user-single', 'admin-db-schemas', 'admin-db-tables', 'me', 'admin-db-table-single'
  ],
  native: [
    'native-home',
    'native-databases'
  ],
  docs : [
    'docs'
  ]
};

export default defs;
