import { html, css } from 'lit';
import '@ucd-lib/pgfarm-client/elements/components/org-teaser/org-teaser.js';

export function styles() {
  const elementStyles = css`
    app-organizations {
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
        <h1>Organizations</h1>
      </div>
    </div>
  </div>
  <div class='l-container l-container--flush-with-page-header u-space-mt--large'>
    <div class="l-quad">
      ${this.orgs.map(org => html`
        <div class='l-quad__region'>
          <org-teaser .data=${org} class='u-space-mb--large'></org-teaser>
        </div>
      `)}
    </div>
  </div>
`;}
