import { html, css } from 'lit';

import buttonStyles from '@ucd-lib/theme-sass/2_base_class/_buttons.css.js';
import user from '@ucd-lib/pgfarm-client/utils/user.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: none;
      position: fixed;
      background-color: var(--white, #fff);
      width: 100%;
      height: 100vh;
      z-index: 1001;
      top: 0;
    }
    .container {
      height: 100%;
      padding: 1rem;
      display: flex;
      justify-content: center;
    }
    .content {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      max-width: 500px;
      width: 100%;
    }
    .icon {
      color: var(--redbud, #c6007e);
      --app-icon-size: 5rem;
      animation: pulse-color 5s infinite ease-in-out;
    }
    @keyframes pulse-color {
      0% {
        color: var(--redbud, #c6007e);
      }
      50% {
        color: var(--double-decker, #c10230);
      }
      100% {
        color: var(--redbud, #c6007e);
      }
    }
    .heading {
      margin: .75em 0 .25em;
      padding: 0;
      font-style: normal;
      font-weight: 800;
      line-height: 1.2;
      color: var(--forced-contrast-heading-primary, #022851);
      font-size: 1.42rem;
      font-style: inherit;
      align-self: flex-start;
    }
    .btn {
      box-sizing: border-box;
      margin-top: 1rem;
    }
    [hidden] {
      display: none !important;
    }
    .errors {
      box-sizing: border-box;
      width: 100%;
      margin-bottom: 2rem;
      margin-top: .5rem;
    }
    pre {
      font-size: .75rem;
      margin: 0;
    }
    .error-details {
      overflow-x: scroll;
      margin-left: .5rem;
      box-sizing: border-box;
      margin-top: .5rem;
    }
    .error-detail {
      margin-bottom: .5rem;
    }
    .error-detail > div:first-child {
      color: var(--ucd-blue, #022851);
      font-weight: 700;
      font-size: .875rem;
    }
    .error-heading {
      color: #13639e;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
    }
    .error-heading:hover {
      text-decoration: underline;
      color: #001124;
    }
    .error {
      margin-bottom: 1rem;
    }
    .buttons {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
    }
  `;

  return [
    buttonStyles,
    elementStyles
  ];
}

export function render() {
return html`
  <div class="container">
    <div class='content'>
    <div class='icon'>
      <app-icon slug='fa.solid.plug-circle-exclamation' invisible-if-empty></app-icon>
    </div>
    <div class='heading' ?hidden=${!this.heading}>${this.heading}</div>
    <div ?hidden=${!this.errors.length} class='errors'>
      ${this.errors.map(error => html`
        <div class='error'>
          <div class='error-heading' @click=${() => this.toggleDetails(error)}>${error.heading}</div>
          <div class='error-details' ?hidden=${!error.showDetails}>
            <div ?hidden=${!error.message} class='error-detail'>
              <div>Message</div>
              <pre>${error.message}</pre>
            </div>
            <div ?hidden=${!error.stack} class='error-detail'>
              <div>Stack</div>
              <pre>${error.stack}</pre>
            </div>
            <div ?hidden=${!error.url} class='error-detail'>
              <div>URL</div>
              <pre>${error.url}</pre>
            </div>
          </div>
        </div>
      `)}
    </div>
    <div class='buttons'>
      <a class='btn btn--primary btn--round' @click=${() => window.location.reload(true)}>Reload Page</a>
      <a ?hidden=${!this.showLoginButton} class='btn btn--primary btn--invert btn--round' href='${user.loginPath}?redirect=${window.location}'>Login</a>
    </div>

    </div>
  </div>
`;}
