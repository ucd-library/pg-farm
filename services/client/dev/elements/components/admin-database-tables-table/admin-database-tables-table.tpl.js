import { html, css } from 'lit';
import '@ucd-lib/pgfarm-client/elements/components/app-search-input/app-search-input.js';

export function styles() {
  const elementStyles = css`
    admin-database-tables-table {
      display: block;
      container-type: inline-size;
    }
    admin-database-tables-table .desktop {
      display: none;
    }
    admin-database-tables-table .mobile {
      display: block;
    }
    @container (min-width: 768px) {
      admin-database-tables-table .desktop {
        display: block;
      }
      admin-database-tables-table .mobile {
        display: none;
      }
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='content'>
    <div class='action-bar'>
      <app-search-input placeholder='Search Tables' @search=${e => this.tableCtl.search(e.detail.value)} search-bar-style='basic'></app-search-input>
    </div>
    ${_renderDesktopView.call(this)}
    ${_renderMobileView.call(this)}
  </div>
`;}

function _renderDesktopView(){
  return html`
    <div class='desktop'>desktop table ${this.tableCtl.getRowCt()}</div>
  `;
}

function _renderMobileView(){
  return html`
    <div class='mobile'>mobile table ${this.tableCtl.getRowCt()}</div>
  `;
}
