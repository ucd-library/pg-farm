import { html, css } from 'lit';
import '../../components/admin-database-subnav/admin-database-subnav.js';

export function styles() {
  const elementStyles = css`
    app-admin-database-overview {
      display: block;
    }
  `;

  return [elementStyles];
}

export function render() {
  const db = this.dataCtl?.db;
  return html`
    <div class='page-header page-header--mb'>
      <div class='page-header__wrapper'>
        <div class='page-header__title'>
          <app-icon class='${db?.brandColor || 'secondary'}' slug=${db?.icon || 'fa.solid.database'}></app-icon>
          <h1>${db?.title || ''}</h1>
        </div>
        <div class='page-header__subtitle' ?hidden=${!db?.organization?.name}>
          via <a class='bold-link' href='/org/${db?.organization?.name}'>${db?.organization?.title}</a>
        </div>
      </div>
    </div>
    <div class='l-basic l-container'>
      <div class='l-sidebar-first'>
        <admin-database-subnav></admin-database-subnav>
      </div>
      <div class='l-content'></div>
    </div>
`;}
