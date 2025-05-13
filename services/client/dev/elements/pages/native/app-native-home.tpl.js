import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
  `;

  return [elementStyles];
}

export function render() { 
return html`

<div ?hidden="${!this.isLoggedIn}">
  <p>Welcome, ${this.username}!</p>
  <p>Your token expires on ${this.expiresText}</p>
</div>
<div ?hidden="${this.isLoggedIn}">
  <h1>Welcome to the Native App</h1>
  <p>Please <a @click="${this._login}">login in</a> to access the features.</p>
</div>

`;}