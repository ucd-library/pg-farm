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
