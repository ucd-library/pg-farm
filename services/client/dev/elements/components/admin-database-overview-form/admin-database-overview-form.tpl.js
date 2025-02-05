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
    admin-database-overview-form .field-description {
      margin-bottom: var(--spacer--small, 0.5rem);
      color: var(--gray, #4c4c4c);
      font-size: var(--font-size--small, 0.875rem);
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
      <div class='field-description'>Limited to 100 characters.</div>
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
      <div class='field-description'>Appears on database listing and search results. Limited to 250 characters.</div>
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
      <label for=${this.idGen.get('description')}>Detailed Description</label>
      <div class='field-description'>Appears on the dedicated information page for the database. </div>
      <textarea
        id=${this.idGen.get('description')}
        .value=${this.payload.description}
        @input=${e => this._onInput('description', e.target.value)}
        rows='5'>
      </textarea>
    </div>
    <div class='field-container'>
      <label>Highlight as Featured</label>
      <div class='field-description'>Highlighted databases appear first on your organization page with colored background. For multiple highlights, most recently selected highlight will show first. </div>
      <ul class="list--reset radio">
        <li>
          <input
            id=${this.idGen.get('isFeatured.false')}
            name='isFeatured'
            type='radio'
            @input=${e => this._onInput('isFeatured', false)}
            .checked=${this.payload.isFeatured === false} />
          <label for=${this.idGen.get('isFeatured.false')}>No</label>
        </li>
        <li>
          <input
            id=${this.idGen.get('isFeatured.true')}
            name='isFeatured'
            type='radio'
            @input=${e => this._onInput('isFeatured', true)}
            .checked=${this.payload.isFeatured === true} />
          <label for=${this.idGen.get('isFeatured.true')}>Yes</label>
        </li>
      </ul>
    </div>
    <div class='field-container'>
      <label>Font Awesome Icon</label>
      <div class='field-description'>Enter a <a href='https://fontawesome.com/v6/search?ic=free' target='_blank'>Font Awesome icon name</a> (link opens in new tab) to change the icon. If left blank, the icon “database” will display by default.</div>
      <app-brand-color-picker .value=${this.payload.brandColor || 'secondary'} @select=${e => this._onInput('brandColor', e.detail.color.id)}></app-brand-color-picker>
      <app-icon-picker
        value=${this.payload.icon}
        default='database'
        brand-color=${this.payload.brandColor || 'secondary'}
        @change=${e => this._onInput('icon', e.detail)}></app-icon-picker>
    </div>
    <div class='field-container'>
      <label for=${this.idGen.get('tags')}>Tags</label>
      <div class='field-description'>Separate tags with a comma. Tags are used to organize and aid search results.</div>
      <input
        id=${this.idGen.get('tags')}
        .value=${this.payload.tags.join(', ')}
        @input=${e => this._onInput('tags', e.target.value)}>
    </div>
    <div class='field-container'>
      <label for=${this.idGen.get('url')}>Website</label>
      <div class='field-description'>Enter a URL for more information about the database.</div>
      <input
        id=${this.idGen.get('url')}
        .value=${this.payload.url}
        @input=${e => this._onInput('url', e.target.value)}>
    </div>
  </form>
`;}
