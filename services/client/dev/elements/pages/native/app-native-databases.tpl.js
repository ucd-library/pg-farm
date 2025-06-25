import { html, css } from 'lit';
import buttonStyles from '@ucd-lib/theme-sass/2_base_class/_buttons.css.js';

import '@ucd-lib/pgfarm-client/elements/components/database-teaser/database-teaser.js';
import '@ucd-lib/pgfarm-client/elements/components/app-no-results/app-no-results.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    a {
      cursor: pointer;
    }
  `;

  return [buttonStyles, elementStyles];
}

export function render() { 
return html`
<div class='page-header'>
  <div class='page-header__wrapper'>
    <div class='page-header__title'>
      <h1 class='primary u-space-mb--large'>My Databases</h1>
    </div>
  </div>
</div>
<div class='l-container u-space-mt--large l-container--flush-with-page-header'>
  <div class="u-space-mb" ?hidden=${!this.total}>
    <span class='gray italic bold'>${this.total} database${this.total != 1 ? 's' : ''}</span>
  </div>
  <div ?hidden=${!this.total}>
    ${this.results.map(result => html`
      <database-teaser .data=${result}></database-teaser>
    `)}
  </div>
  <app-no-results ?hidden=${this.total} text="You have no databases." hide-subtext></app-no-results>
</div>

`;}