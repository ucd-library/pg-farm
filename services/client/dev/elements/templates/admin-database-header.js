import { html } from 'lit';

export default function render(db) {
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
  `;
}
