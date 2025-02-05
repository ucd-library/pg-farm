import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    admin-org-metadata-form {
      display: block;
    }
    admin-org-metadata-form .field-description {
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
      <label for=${this.idGen.get('description')}>About</label>
      <textarea
        id=${this.idGen.get('description')}
        .value=${this.payload.description}
        @input=${e => this._onInput('description', e.target.value)}
        maxlength='250'
        rows='5'>
      </textarea>
    </div>
    <div class='field-container'>
      <label for=${this.idGen.get('url')}>Website</label>
      <input
        id=${this.idGen.get('url')}
        .value=${this.payload.url}
        @input=${e => this._onInput('url', e.target.value)}>
    </div>
  </form>
`;}
