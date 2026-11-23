import { html } from 'lit';

/**
 * @description Dialog modal content for deleting a user or users
 * @param {Object|Array} user - A user object or array of user objects
 * @returns {TemplateResult}
 */
export function deleteUserConfirmation(user, deleteFromInstance = false){
  if ( !Array.isArray(user) ) user = [user];
  return html`
    <div>
      ${user.length > 1 ? html`
        <p>Are you sure you want to delete <strong>${user.length} users</strong>?</p>
        ` : html`
        <p>Are you sure you want to delete user <strong>${user[0].name}</strong>?</p>
        `}
      <div ?hidden=${!deleteFromInstance}>
        <p class='double-decker'>This will remove the user from the instance and revoke access to all databases running on this instance</p>
      </div>
      <div ?hidden=${deleteFromInstance}>
        <p class='double-decker'>This will revoke all database access</p>
      </div>
    </div>
  `
}

/**
 * @description Dialog modal content for updating schema access
 * @param {Object|Array} user - A user object or array of user objects
 * @param {String} schema - The schema name
 * @returns {TemplateResult}
 */
export function removeSchemaAccess(user, schema){
  if ( !Array.isArray(user) ) user = [user];
  let userText = user.length > 1 ? `${user.length} users` : user[0].name;
  return html`
    <div>
      <p>Are you sure you want to remove access for <strong>${userText}</strong> on schema <strong>${schema}</strong>?</p>
      <p class='double-decker'>This will revoke access to all tables in this schema</p>
    </div>
  `
}

/**
 * @description Dialog modal content for rotating a service account password
 * @param {*} user - A user or service account object
 * @returns {TemplateResult}
 */
export function renderServiceAccountRotationConfirmation(user){
  const username = user?.name || user?.username;
  return html`
    <p>Are you sure you want to generate a new password for service account <strong>${username}</strong>?</p>
    <p>To ensure there is no disruption to services, deploy your new secret before your access token expires.</p>
    <p>See the <a href="/docs/authenticate-service-account">service account documentation</a> for more information.</p>
    <p><strong>This action cannot be undone.</strong></p>
    `
}

/**
 * @description Render a list of tables/views for the public user disable confirmation
 * @param {String} label - access label, e.g. WRITE or READ
 * @param {Array} tables - array of table summary objects {schema, name, type, columnLevel}
 * @returns {TemplateResult}
 */
function _publicUserTableList(label, tables){
  if ( !tables.length ) return html``;
  return html`
    <details ?open=${tables.length <= 10}>
      <summary><strong>${label}</strong> (${tables.length} table/view${tables.length === 1 ? '' : 's'})</summary>
      <ul class='public-user-table-list'>
        ${tables.map(t => html`
          <li><code>${t.schema}.${t.name}</code> <span class='caption'>${t.type?.toLowerCase()}${t.columnLevel ? ', column level' : ''}</span></li>
        `)}
      </ul>
    </details>
  `;
}

/**
 * @description Dialog modal content for disabling (removing) the public user.  Lists the
 * tables/views the public user currently has READ or WRITE access to, which will be removed.
 * @param {Object} summary - public user summary from the api (InstanceModel.disablePublicUser dry run)
 * @param {String} instanceName - name of the instance the public user belongs to
 * @returns {TemplateResult}
 */
export function publicUserDisableConfirmation(summary={}, instanceName=''){
  const databases = summary.databases || [];
  const counts = summary.counts || {read: 0, write: 0};
  const lastLogin = summary.recentLogins?.lastLogin ? new Date(summary.recentLogins.lastLogin).toLocaleString() : 'never';
  return html`
    <div>
      <p>
        Are you sure you want to disable (remove) the public user <strong>${summary.username}</strong>
        for instance <strong>${instanceName}</strong>?
      </p>
      <p class='double-decker'>
        This will remove <strong>all</strong> public user permissions in <strong>every database</strong> on this instance,
        including <strong>${counts.write}</strong> table/view(s) with write access and <strong>${counts.read}</strong> with read access.
        Anyone using the public user credentials, anonymous REST API access and database links that use the public user will stop working.
        Re-enabling the public user will <strong>not</strong> restore these permissions.
      </p>
      <p class='caption'>
        Last public SQL login: ${lastLogin}
        (${summary.recentLogins?.count30d || 0} in the last 30 days).
        Anonymous REST API requests are not tracked.
      </p>
      ${databases.length ? html`
        <h4>Current public user permissions</h4>
        ${databases.map(db => html`
          <div class='public-user-db'>
            <div><strong>Database: ${db.database}</strong></div>
            ${_publicUserTableList('Write', db.tables.filter(t => t.access === 'WRITE'))}
            ${_publicUserTableList('Read', db.tables.filter(t => t.access === 'READ'))}
            ${_publicUserTableList('Other', db.tables.filter(t => t.access === 'OTHER'))}
            <div class='caption' ?hidden=${!db.schemas?.length}>
              Schema access: ${(db.schemas || []).map(s => `${s.name} (${s.privileges.join(', ')})`).join(', ')}
            </div>
          </div>
        `)}
      ` : html`<p>The public user has no table or view permissions.</p>`}
      <div ?hidden=${!summary.errors?.length} class='alert alert--error'>
        Unable to read permissions for: ${(summary.errors || []).map(e => e.database).join(', ')}
      </div>
    </div>
  `;
}

/**
 * @description Dialog modal content for enabling the public user
 * @param {String} instanceName - name of the instance the public user belongs to
 * @param {String} username - public user username
 * @returns {TemplateResult}
 */
export function publicUserEnableConfirmation(instanceName='', username=''){
  return html`
    <div>
      <p>Are you sure you want to enable the public user <strong>${username}</strong> for instance <strong>${instanceName}</strong>?</p>
      <p class='double-decker'>
        Anyone will be able to connect to <strong>every database</strong> on this instance using the shared,
        publicly documented public user credentials, and anonymous REST API access will be enabled.
      </p>
      <p>The public user will only have access to the <code>api</code> schema until you grant it access to other schemas or tables.
        Permissions removed by a previous disable are not restored.</p>
    </div>
  `;
}
