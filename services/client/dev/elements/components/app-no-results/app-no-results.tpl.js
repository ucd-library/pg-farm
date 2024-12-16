import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    .container {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      margin-top: 1rem;
      margin-bottom: 1rem;
      text-align: center;
    }
    .icon {
      --app-icon-size: 2.5rem;
      color: var(--app-no-results-icon-color, var(--ucd-blue-80, #13639e));
    }
    .text {
      font-size: var(--font-size--large, 1.25rem);
      font-weight: var(--font-weight--bold, 700);
    }
    .subtext {
      font-size: var(--font-size, .1rem);
      color: var(--gray, #4c4c4c);
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='container'>
    <app-icon class='icon' slug='fa.solid.circle-exclamation'></app-icon>
    <div class='text'>${this.text}</div>
    <div class='subtext'>${this.subtext}</div>
  </div>
`;}
