import { html, css } from 'lit';
import chunkIntoColumns from '../../utils/chunkIntoColumns.js';

export function styles() {
  const elementStyles = css`
    app-home {
      display: block;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
<div class='l-container--narrow-desktop u-space-py-responsive--huge'>
  <div class='alignable-promo'>
    <div class="alignable-promo__wrapper">
      <h1 class='alignable-promo__title black'>PG-Farm hosts your data so you can focus on your research</h1>
      <div class="alignable-promo__text">24/7 access to a full PostgreSQL database environment with easy management of who can access to your data.</div>
      <div class="alignable-promo__buttons">
        <a href="#" class="btn btn--primary">Get Started</a>
        <a href="#" class="btn btn--invert">Learn More</a>
      </div>
      <div class="alignable-promo__text u-space-mt--small">or <a href='#'>find a database</a></div>
    </div>
  </div>
</div>
<div class='u-space-py-responsive--medium-2x bg--blue-30'>
  <div class='l-container'>
    <h2 class='u-align--center u-space-mb--large'>Key Features</h2>
    <div>
      ${chunkIntoColumns(this.features, 3).map(row => html`
          <div class="${row.class}">
            ${row.columns.map(col => html`
              <div class="${col.class} u-space-mb--large u-space-mt--flush">
                <h3 class='h4'>${col.item.title}</h3>
                <div>${col.item.description}</div>
              </div>
            `)}
          </div>
        `)}
    </div>
  </div>
</div>




`;}
