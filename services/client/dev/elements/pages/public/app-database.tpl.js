import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    app-database {
      display: block;
    }
    app-database .page-header__subtitle{
      font-size: 1.2rem;
      line-height: 1.5rem;
    }
    app-database .page-header__subtitle a {
      color: var(--ucd-blue-80, #13639E);
      text-decoration: none;
      font-weight: var(--font-weight--bold, 700);
    }
    app-database .page-header__subtitle a:hover {
      text-decoration: underline;
      color: var(--ucd-blue-80, #13639E);
    }
    app-database .details > div {
      margin-top: 2rem;
    }
    app-database .details > div:first-child {
      margin-top: 0;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='page-header'>
    <div class='page-header__wrapper'>
      <div class='page-header__title'>
        <app-icon class='${this.dataCtl.db?.brandColor || 'secondary'}' slug=${this.dataCtl.db?.icon || 'fa.solid.database'}></app-icon>
        <h1>${this.dataCtl.db?.title || ''}</h1>
      </div>
      <div class='page-header__subtitle' ?hidden=${!this.dataCtl.db?.organization?.name}>
        via <a href='/org/${this.dataCtl.db?.organization?.name}'>${this.dataCtl.db?.organization?.title}</a>
      </div>
      <div class='page-header__description' ?hidden=${!this.dataCtl.db?.shortDescription}>
        ${this.dataCtl.db?.shortDescription}
      </div>
    </div>
  </div>
  <div class='l-container--narrow-desktop u-space-mt--large'>
    <div class='details'>
      <div ?hidden=${!this.dataCtl.db?.description}>
        <h2 class='h4'>About</h2>
        <p>${this.dataCtl.db?.description}</p>
      </div>
      <div>
        <h2 class='h4'>Access</h2>
        <div>Todo: not sure where to get this info</div>
      </div>
      <div ?hidden=${ !this.dataCtl.db?.url }>
        <h2 class='h4'>Webpage</h2>
        <div><a href='${this.dataCtl.db?.url}'>${this.dataCtl.db?.url}</a></div>
      </div>
      <div ?hidden=${ !this.dataCtl.db?.tags?.length }>
      <h2 class='h4'>Tags</h2>
      <div>
        ${this.dataCtl.db?.tags?.map(tag => html`<a href='/search?tags=${encodeURIComponent(tag)}' class='tags__tag'>${tag}</a>`)}
      </div>
      </div>
    </div>
  </div>

`;}
