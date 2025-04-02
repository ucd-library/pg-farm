import { html, css } from 'lit';

import userUtils from '@ucd-lib/pgfarm-client/utils/user.js';

export function styles() {
  const elementStyles = css`
    app-admin-user-profile {
      display: block;
    }
  `;

  return [elementStyles];
}

export function render() {

return html`
  <div class='page-header'>
    <div class='page-header__wrapper'>
      <div class='page-header__title'>
        <h1>${this.displayName}</h1>
      </div>
      <div class='page-header__description'>
        <p>Logged in as <strong class='italic'>${this.dataCtl?.me?.username}</strong></p>
        <div><a href=${userUtils.logoutPath}>Log out</a></div>
      </div>
    </div>
  </div>
  <div class='l-container u-space-mt--large l-container--flush-with-page-header'>
    <h2 class='primary'>My Organizations</h2>
    <p>todo</p>
  </div>

`;}
