import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
      --app-icon-size: 3rem;
    }
    .container {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .loading app-icon {
      animation: spin 1s linear infinite;
      opacity: 0.5;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='container ${this._loading ? 'loading' : ''}'>
    <app-icon slug=${this._loading ? 'fa-circle-notch' : this.value || this._default}></app-icon>
    <input
      type='text'
      .value=${this._value}
      @input=${e => this._onInput(e.target.value)}
    />
  </div>

`;}
