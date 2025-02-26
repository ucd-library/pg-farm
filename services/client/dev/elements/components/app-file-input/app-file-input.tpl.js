import { html, css } from 'lit';
import { ref } from 'lit/directives/ref.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    input[type="file"] {
      display: none !important;
    }
    [hidden] {
      display: none !important;
    }
    .upload-box {
      display: flex;
      align-items: center;
      padding: 1rem;
      gap: 1rem;
      border: 1px dashed var(--ucd-blue-70, #73ABDD);
      cursor: pointer;
    }
    .dragging .upload-box {
      border: 1px solid var(--ucd-gold, #ffbf00);
    }
    .thumbnail-wrapper {
      position: relative;
      width: 5rem;
      height: 5rem;
      min-width: 5rem;
      min-height: 5rem;
    }
    .thumbnail-wrapper .placeholder {
      height: 100%;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ucd-blue-30, #EBF3FA);
      color: var(--ucd-blue-70, #73ABDD);
      --app-icon-size: 3rem;
    }
    .thumbnail {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    label {
      flex-grow: 1;
    }
    .label {
      font-size: 1rem;
      font-weight: 700;
      color: var(--ucd-blue-80, #13639E);
      cursor: pointer;
    }
    .label-subtext {
      font-size: 0.875rem;
      color: var(--ucd-black-70, #4C4C4C);
      font-weight: 400;
      cursor: pointer;
    }
    .error {
      font-size: 0.875rem;
      color: var(--double-decker, #c10230);
    }
    a.remove-image {
      color: var(--ucd-blue-80, #13639E);
      font-size: 0.875rem;
      text-decoration: underline;
      font-weight: 400;
      margin-top: 0.5rem;
      cursor: pointer;
    }
    a.remove-image:hover {
      color: var(--secondary-tahoe, #00B2E3);
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='container ${this.dragging ? 'dragging' : 'not-dragging'}'>
    <div
      class='upload-box'
      @click=${this.openFilePicker}
      @dragover=${this._onDragOver}
      @dragleave=${this._onDragLeave}
      @drop=${this._onDrop}
      >
      <div class='thumbnail-wrapper'>
        <div class='placeholder' ?hidden=${this.imageUrl}>
          <app-icon slug='fa.solid.image'></app-icon>
        </div>
        <img class='thumbnail' ?hidden=${!this.imageUrl} src="${this.imageUrl}" alt='Preview'/>
      </div>
      <label for="file-input">
        <div class='label'>${this.label}</div>
        <div class='label-subtext' ?hidden=${!this.labelSubtext}>${this.labelSubtext}</div>
        <div class='error' ?hidden=${!this.errorMessage}>${this.errorMessage}</div>
      </label>
      <input ${ref(this.inputRef)} type="file" id="file-input" @change="${this._onFileInput}" accept="image/*" />
    </div>
    <a ?hidden=${!this.imageUrl} class='remove-image' @click=${this._onRemoveImage}>Remove Image</a>
  </div>
`;}
