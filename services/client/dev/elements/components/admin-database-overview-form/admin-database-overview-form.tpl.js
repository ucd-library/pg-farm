import { html, css } from 'lit';
import '../app-brand-color-picker/app-brand-color-picker.js';
import '../app-icon-picker/app-icon-picker.js';

export function styles() {
  const elementStyles = css`
    admin-database-overview-form {
      display: block;
    }
    admin-database-overview-form app-brand-color-picker {
      margin-top: 1rem;
      margin-bottom: 1.5rem;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <form @submit=${this._onSubmit}>
  <div class='field-container'>
      <div class='flex flex--wrap flex--align-center'>
        <label for=${this.idGen.get('title')} class='u-space-mr--small u-space-pb--flush'>Title</label>
        <div class='gray font-size--small'>(required)</div>
      </div>
      <div class='gray font-size--small u-space-mb--small'>Limited to 100 characters.</div>
      <input
        id=${this.idGen.get('title')}
        .value=${this.payload.title}
        @input=${e => this._onInput('title', e.target.value)}
        maxlength='100'
        required>
    </div>
    <div class='field-container'>
      <div class='flex flex--wrap flex--align-center'>
        <label for=${this.idGen.get('shortDescription')} class='u-space-mr--small u-space-pb--flush'>Short Description</label>
        <div class='gray font-size--small'>(required)</div>
      </div>
      <div class='gray font-size--small u-space-mb--small'>Appears on database listing and search results. Limited to 250 characters.</div>
      <textarea
        id=${this.idGen.get('shortDescription')}
        .value=${this.payload.shortDescription}
        @input=${e => this._onInput('shortDescription', e.target.value)}
        maxlength='250'
        rows='3'
        required>
      </textarea>
    </div>
    <div class='field-container'>
      <label>Font Awesome Icon</label>
      <div class='gray font-size--small u-space-mb--small'>Enter a <a href='https://fontawesome.com/v6/search?ic=free' target='_blank'>Font Awesome icon name</a> (link opens in new tab) to change the icon. If left blank, the icon “database” will display by default.</div>
      <app-brand-color-picker .selectedColor=${this.payload.brandColor || 'secondary'} @select=${e => this._onInput('brandColor', e.detail.color.id)}></app-brand-color-picker>
      <app-icon-picker value=${this.payload.icon} default='database' icon-set='fa.solid'></app-icon-picker>
    </div>
  </form>
`;}
