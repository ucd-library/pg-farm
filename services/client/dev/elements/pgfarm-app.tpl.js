import { html, css } from 'lit';
import user from '../utils/user.js';
import {config} from '../../../../tools/lib/config.js';

export function styles() {
  const elementStyles = css`
    pgfarm-app {
      display: block;
    }
    .site-credits__logo app-icon {
      width: 100%;
      --app-icon-size: 100%;
    }
    .footer-spacer__logo app-icon {
      width: 6rem;
      --app-icon-size: 100%;

    }
    @media (min-width: 300px) {
      .site-credits__logo app-icon {
        width: 220px;
      }
      .footer-spacer__logo app-icon {
        width: 12rem;
      }
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='${user.loggedIn ? 'user-logged-in' : 'user-logged-out'}'>
    ${ config.isNativeApp ? _renderElectronHeader.call(this) : _renderHeader.call(this) }
    ${ _renderMainContent.call(this) }
    ${ _renderFooter.call(this) }
  </div>
`;}

function _renderMainContent(){
  return html`
  <app-loader></app-loader>
  <app-error></app-error>
  <app-dialog-modal></app-dialog-modal>
  <app-toast></app-toast>
  <div class="main-content">
    <ucdlib-pages
      id='app-pages'
      selected=${this.page}
      attr-for-selected='page-id'>
      <app-home page-id="home"></app-home>
      <app-features page-id="features"></app-features>
      <app-contact page-id="contact"></app-contact>
      <app-search page-id="search"></app-search>
      <app-organizations page-id="org"></app-organizations>
      <app-organization page-id="org-single"></app-organization>
      <app-database page-id="db"></app-database>

      <app-admin-database-overview page-id="admin-db-overview"></app-admin-database-overview>
      <app-admin-database-users page-id="admin-db-users"></app-admin-database-users>
      <app-admin-database-user-single page-id="admin-db-user-single"></app-admin-database-user-single>
      <app-admin-database-schemas page-id="admin-db-schemas"></app-admin-database-schemas>
      <app-admin-database-tables page-id="admin-db-tables"></app-admin-database-tables>
      <app-admin-user-profile page-id="me"></app-admin-user-profile>
    </ucdlib-pages>
  </div>
  `;
}

/**
 * @description App header template
 * @returns {TemplateResult}
 */
function _renderHeader(){
  return html`
    <ucd-theme-header>
      <ucdlib-branding-bar
        site-name="PG Farm"
        slogan="via UC Davis Library">
      </ucdlib-branding-bar>
      <ucd-theme-primary-nav>
        <a href="/features">Features</a>
        <a href="/search">Find a Database</a>
        <a href="/org">Organizations</a>
        <a href="/contact">Contact</a>
      </ucd-theme-primary-nav>
      <ucd-theme-search-popup>
        <ucd-theme-search-form
        @search=${this._onSearch}
        .value=${this.siteSearchValue}
        >
        </ucd-theme-search-form>
      </ucd-theme-search-popup>
      <ucd-theme-quick-links
        title=${user.loggedIn ? 'My Account' : 'Sign In'}
        href=${user.loggedIn ? '' : user.loginPath}
        use-icon
        style-modifiers="highlight">
        <svg slot="custom-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"/></svg>
        <a href='/me'>Manage Databases</a>
        <a href=${user.logoutPath}>Sign Out</a>
      </ucd-theme-quick-links>
    </ucd-theme-header>
  `;
}

function _renderElectronHeader(){
  return html`
    <ucd-theme-header>
      <ucdlib-branding-bar
        site-name="PG Farm"
        slogan="via UC Davis Library">
      </ucdlib-branding-bar>
      <ucd-theme-primary-nav>
        <ul link-text="My Databases">
        ${this.userDatabases.map(db => html`
          <li><a href="${db.link}">${db.title}</a></li>
        `)}
        </ul>
      </ucd-theme-primary-nav>
    </ucd-theme-header>
  `;
}

/**
 * @description App footer template
 * @returns {TemplateResult}
 */
function _renderFooter(){
  return html`
    <footer class="l-footer footer dark-background">
      <div class="l-container">
        <div class="flex-footer">
          <div class="flex-footer__item">
            <div class="site-credits u-space-mb">
              <div class='site-credits__logo'>
                <app-icon slug='ucdlib-signature' auto-height></app-icon>
              </div>
              <p>
                UC Davis Library<br>
                100 NW Quad<br>
                University of California, Davis<br>
                Davis, CA 95616
              </p>
              <div><a href='https://library.ucdavis.edu'>library.ucdavis.edu</a></div>
            </div>
            <app-build-info></app-build-info>
          </div>
          <div class="flex-footer__item">
            <h2>PG Farm</h2>
            <div class="footer-nav">
              <ul class="menu">
                <li><a href='/features'>Features</a></li>
                <li><a href='#'>Documentation</a></li>
                <li><a href='#'>Support</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="footer-spacer">
          <div class='footer-spacer__logo'>
            <a href='https://ucdavis.edu'>
              <app-icon slug='aggie-logo' auto-height></app-icon>
            </a>
          </div>
        </div>
        <div class="uc-footer">
          <p><a href="https://www.ucdavis.edu/">University of California, Davis</a>, One Shields Avenue, Davis, CA 95616 | 530-752-1011</p>
          <ul class="list--pipe">
            <li><a href="#">Questions or comments?</a></li>
            <li><a href="#">Privacy & Accessibility</a></li>
            <li><a href="https://diversity.ucdavis.edu/principles-community">Principles of Community</a></li>
            <li><a href="http://www.universityofcalifornia.edu/">University of California</a></li>
          </ul>
          <p>Copyright © The Regents of the University of California, Davis campus. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `;
}
