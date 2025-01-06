import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    app-features {
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
        <h1>PG-Farm Features</h1>
      </div>
      <div class='page-header__description'>
        This should be a more in-depth technical dive vs the homepage
      </div>
    </div>
  </div>
  <div class='l-container--narrow-desktop u-space-mt--large'>
    <h2 class='h4'>What is PG-Farm?</h2>
    <p>Some stuff will go here</p>
  </div>
`;}
