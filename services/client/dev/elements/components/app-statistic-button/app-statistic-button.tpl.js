import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
      flex-grow: 1;
      width: 100%;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      text-decoration: none;
      border: none;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      transition: background-color .2s ease;
      padding: .875rem;
    }
    .container app-icon {
      margin-bottom: .875rem;
      --app-icon-size: 2.5rem;
      transition: color .2s ease;
    }
    .text {
      margin-bottom: .25em;
      padding: 0;
      color: var(--forced-contrast-heading-primary, #022851);
      font-style: normal;
      font-weight: 800;
      line-height: 1.2;
      font-size: 1.092rem;
    }
    .subtext {
      font-size: 1rem;
      color: var(--black, #000);
      line-height: 1.2;
    }
    @media (min-width: 768px) {
      .container {
        padding: var(--spacer--medium, 1.5rem);
      }
      .text {
        font-size: 1.428rem;
      }
      .container app-icon {
        margin-bottom: var(--spacer, 1rem);
      }
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <style>
    .container app-icon {
      color: ${this._brandColorHex};
    }
    .container {
      background-color: ${this._brandColorHex + '26'};
    }
    .container:hover {
      background-color: ${this._brandColorHex + '40'};
    }
  </style>
  ${this.href ? html`
    <a class='container' href=${this.href}>${_renderContent.call(this)}</a>` : html`
    <button class='container'>${_renderContent.call(this)}</button>`}
`;}

function _renderContent(){
  return html`
    <app-icon slug=${this.icon} transform-degrees=${this.transformDegrees}></app-icon>
    <div class='text'>${this.text}</div>
    <div class='subtext'>${this.subtext}</div>
  `;
}
