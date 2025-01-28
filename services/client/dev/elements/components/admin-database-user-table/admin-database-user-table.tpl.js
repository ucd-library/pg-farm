import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    admin-database-user-table {
      display: block;
      container-type: inline-size;
    }
    admin-database-user-table .desktop {
      display: none;
    }
    admin-database-user-table .mobile {
      display: block;
    }
    @container (min-width: 768px) {
      admin-database-user-table .desktop {
        display: block;
      }
      admin-database-user-table .mobile {
        display: none;
      }
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='content'>
    ${_renderDesktopView.call(this)}
    ${_renderMobileView.call(this)}
  </div>
`;}

function _renderDesktopView(){
  return html`
    <div class='app-table desktop'>desktop view</div>
  `;
}

function _renderMobileView(){
  return html`
    <div class='app-table mobile'>mobile view</div>
  `;
}
