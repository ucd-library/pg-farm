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
      text-align: left;
    }
    .logged-in .token-info button {
      margin-top: 1rem;
    }

    a {
      cursor: pointer;
    }

    .token-info p {
      line-height: 1.618;
      font-size: 1rem;
    }
  `;

  return [buttonStyles, elementStyles];
}

export function render() { 
return html`

<div class="logged-in" ?hidden="${!this.isLoggedIn}">

  <div class='page-header'>
    <div class='page-header__wrapper'>
      <div class='page-header__title'>
        <h1>${this.username}</h1>
      </div>
      <div class='page-header__description'>
        <p>Logged in as <strong class='italic'>${this.username}</strong></p>
        <div><a href='#logout'>Log out</a></div>
      </div>
    </div>
  </div>
  <div class='l-container u-space-mt--large l-container--flush-with-page-header'>
    <h2 class='primary u-space-mb--large'>Token</h2>
    <div>
      <div class="token-info">
        <p>Your password is a <em>temporary</em> token that expires on <strong>${this.expiresText}</strong>,
          at which point you will need to login again.
        </p>

        <button class='btn btn--primary' @click="${this._copyToken}">Copy Token to Clipboard</button>
      </div>
    </div>
  </div>
</div>

<div ?hidden="${this.isLoggedIn}">
  <div class='l-container u-space-mt--large l-container--flush-with-page-header'>
    <h1>Welcome to the Native App</h1>
    <p>Please <a @click="${this._login}">login</a> to access the features.</p>
  </div>
</div>
`;}