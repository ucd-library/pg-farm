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
      padding: var(--spacer--medium, 1.5rem);
      background-color: var(--ucd-blue-30, #EBF3FA);
      cursor: pointer;
      text-decoration: none;
      border: none;
      width: 100%;
      box-sizing: border-box;
    }
    .container app-icon {
      margin-bottom: var(--spacer, 1rem);
      --app-icon-size: 2.5rem;
      color: var(--ucd-blue-70, #73ABDD);
    }
    .container:hover {
      background: var(--ucd-gold-50, #FDE9AC);
    }
    .container:hover app-icon {
      color: var(--ucd-gold, #FFBF00);
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
    @media (min-width: 768px) {
      .text {
        font-size: 1.428rem;
      }
    }
    .subtext {
      font-size: 1rem;
      color: var(--black, #000);
      line-height: 1.2;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  ${this.href ? html`
    <a class='container' href=${this.href}>${_renderContent.call(this)}</a>` : html`
    <button class='container'>${_renderContent.call(this)}</button>`}
`;}

function _renderContent(){
  return html`
    <app-icon slug=${this.icon}></app-icon>
    <div class='text'>${this.text}</div>
    <div class='subtext'>${this.subtext}</div>
  `;
}
