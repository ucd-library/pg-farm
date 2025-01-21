import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    .container {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .swatch {
      border-radius: 50%;
      width: 1.5rem;
      height: 1.5rem;
      min-width: 1.5rem;
      min-height: 1.5rem;
      border-style: solid;
      border-width: 3px;
      cursor: pointer;
    }
    .swatch:hover {
      border-color: var(--ucd-blue-60, #B0D0ED) !important;
    }
    .swatch.selected {
      border-color: var(--ucd-blue, #022851) !important
    }

  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='container'>
    ${this._colors.map(color => html`
      <div
        title=${color.title}
        class='swatch ${color.id === this.value ? 'selected' : ''}'
        style='background-color:${color.hex};border-color:${color.hex}' @click=${() => this._onSelect(color)}>
      </div>
      `)}
  </div>

`;}
