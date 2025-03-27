import { html } from 'lit';

/**
 * @description Dialog modal content for deleting a user or users
 * @param {Object|Array} user - A user object or array of user objects
 * @returns {TemplateResult}
 */
export function deleteUserConfirmation(user){
  if ( !Array.isArray(user) ) user = [user];
  return html`
    <div>
      ${user.length > 1 ? html`
        <p>Are you sure you want to delete <strong>${user.length} users</strong>?</p>
        ` : html`
        <p>Are you sure you want to delete user <strong>${user[0].name}</strong>?</p>
        `}
      <p class='double-decker'>This will revoke all database access</p>
    </div>
  `
}
