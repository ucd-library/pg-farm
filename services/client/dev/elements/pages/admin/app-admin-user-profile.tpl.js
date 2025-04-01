import { html, css } from 'lit';

import user from '@ucd-lib/pgfarm-client/utils/user.js';

export function styles() {
  const elementStyles = css`
    app-admin-user-profile {
      display: block;
    }
  `;

  return [elementStyles];
}

export function render() {

  if ( !user.loggedIn ) {
    return html``
  }
return html`
  <p>foo barr</p>

`;}
