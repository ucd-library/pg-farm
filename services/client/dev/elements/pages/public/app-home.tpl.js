import { html, css } from 'lit';
import chunkIntoColumns from '@ucd-lib/pgfarm-client/utils/chunkIntoColumns.js';
import '@ucd-lib/pgfarm-client/elements/components/database-teaser/database-teaser.js';

export function styles() {
  const elementStyles = css`
    app-home {
      display: block;
    }
    .featured-projects database-teaser {
      margin-top: var(--spacer--medium, 2rem);
    }
    .featured-projects database-teaser:first-child {
      margin-top: 0;
    }
    .project-cta {
      padding-top: 1rem;
    }
    .featured-projects[hidden] + .project-cta {
      padding-top: 3rem;
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
      <div class="alignable-promo__text">24/7 access to a full PostgreSQL database environment with easy management of who can access your data.</div>
      <div class="alignable-promo__buttons">
        <a href="/contact" class="btn btn--primary">Get Started</a>
        <a href="/features" class="btn btn--invert">Learn More</a>
      </div>
      <div class="alignable-promo__text u-space-mt--small">or <a href='/search'>find a database</a></div>
    </div>
  </div>
</div>

<div class='u-space-py-responsive--medium-2x bg--blue-30'>
  <div class='l-container'>
    <h2 class='u-align--center u-space-mb--large'>Key Features</h2>
    <div>
      ${chunkIntoColumns(this.features, 3).map(row => html`
        <div class=${row.class}>
          ${row.columns.map(col => html`
            <div class="${col.class} u-space-mb--large u-space-mt--flush">
              <app-icon class='blue-70 u-block' slug=${col.item.icon} size='medium-2x' fetch-method='page-load'></app-icon>
              <h3 class='h4 u-space-mt--small'>${col.item.title}</h3>
              <div>${col.item.description}</div>
            </div>
          `)}
        </div>
      `)}
    </div>
  </div>
</div>

<div class='u-space-py-responsive--medium-2x featured-projects' ?hidden=${!this.dataCtl.featuredDbs?.length}>
  <div class='l-container'>
    <div class='l-2col l-2col--33-67'>
      <div class='l-first'>
        <h2 class='u-align--center heading--weighted'>
          <span class='heading--weighted--weighted'>Project Examples</span>
        </h2>
      </div>
      <div class='l-second'>
        ${this.dataCtl?.featuredDbs?.map(db => html`
          <database-teaser .data=${db}></database-teaser>
        `)}
      </div>
    </div>
  </div>
</div>

<div class='u-space-pb--medium-2x project-cta'>
  <div class='alignable-promo'>
    <div class="alignable-promo__wrapper">
      <h2 class='black u-space-mb--large'>To get started, tell us about your project</h2>
      <div class="alignable-promo__buttons">
        <a href="/contact" class="btn btn--primary">Get Started</a>
        <a href="/features" class="btn btn--invert">Learn More</a>
      </div>
    </div>
  </div>
</div>
`;}
