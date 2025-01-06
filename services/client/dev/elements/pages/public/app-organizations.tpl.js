import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    app-organizations {
      display: block;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='page-header'>
    <div class='page-header__wrapper'>
      <div class='page-header__title'>
        <h1>Organizations</h1>
      </div>
      <div class='page-header__description'>
        Something will go here. There is currently no figma design and no search method, so this is a todo
      </div>
    </div>
  </div>
`;}
