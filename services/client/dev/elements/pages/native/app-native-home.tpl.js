import { html, css } from 'lit';
import buttonStyles from '@ucd-lib/theme-sass/2_base_class/_buttons.css.js';


export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    .logged-in {
      margin: 1rem;
    }
    .logged-in .token-info {
      text-align: center;
    }
    a {
      cursor: pointer;
    }
  `;

  return [buttonStyles, elementStyles];
}

export function render() { 
return html`

<div class="logged-in" ?hidden="${!this.isLoggedIn}">
  <p>Welcome, ${this.username}!</p>
  <div class="token-info">
    <button class='btn btn--primary' @click="${this._copyToken}">Copy Token to Clipboard</button>
    <p>Your <b>password</b> is a <b>temporary token</b> that expires on <b>${this.expiresText}</b>,
      at which point you will need to login again.
    </p>
  </div>
</div>
<div ?hidden="${this.isLoggedIn}">
  <h1>Welcome to the Native App</h1>
  <p>Please <a @click="${this._login}">login in</a> to access the features.</p>
</div>

`;}