import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    pgfarm-app {
      display: block;
    }

    .loading-dots {
      text-align: center;
      z-index: 5;
      color: var(--default-primary-color);
    }

    .dot {
      display: inline;
      margin-left: 0.2em;
      margin-right: 0.2em;
      position: relative;
      font-size: 3.5em;
      opacity: 1;
    }

    .dot.one {
      animation-delay: 0.2s;
    }
    .dot.two {
      animation-delay: 0.4s;
    }
    .dot.three {
      animation-delay: 0.6s;
    }

    @keyframes showHideDot {
      0% {
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      60% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
    @media (max-width: 768px) {
      .footer.site-frame {
        padding: 0.5rem;
      }
    }
  `;

  return [elementStyles];
}

export function render() {
return html`

  <ucd-theme-header>

    <ucdlib-branding-bar
      site-name="PG Farm"
      slogan="via UC Davis Library">
    </ucdlib-branding-bar>

    <ucd-theme-primary-nav>
      <a href="#">Features</a>
      <a href="#">Find a Database</a>
      <a href="#">Organizations</a>
      <a href="#">Contact</a>
    </ucd-theme-primary-nav>

    <ucd-theme-search-popup>
      <ucd-theme-search-form
        @search=${e => console.log(e.detail.searchTerm)}>
      </ucd-theme-search-form>
    </ucd-theme-search-popup>

    <ucd-theme-quick-links
      title="Sign In"
      use-icon
      style-modifiers="highlight">
      <svg slot="custom-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"/></svg>
      <a href="#">Need to update component to optionally turn into button</a>
      <a href="#">also set some css vars for icon/bg color</a>
    </ucd-theme-quick-links>
  </ucd-theme-header>

  <div class="main-content">
    <ucdlib-pages
      selected=${this.page}
      attr-for-selected='page-id'
    >
      <app-home page-id="home"></app-home>
      <app-search page-id="search"></app-search>
      <app-database page-id="db"></app-database>
    </ucdlib-pages>

    <div class="footer site-frame">
      <ucdlib-site-footer>
        <ucdlib-site-footer-column header="PG Farm">
          <ul>
            <li><a href="/search">Discover</a></li>
            <li><a href="/about">About PG Farm</a></li>
            <li><a href="">FAQ</a></li>
          </ul>
        </ucdlib-site-footer-column>
        <ucdlib-site-footer-column header="Library Info">
          <ul>
            <li>
              <a
                href="https://library.ucdavis.edu/special-collections/"
                target="_blank"
                rel="noopener"
                >Archives and Special Collections</a
              >
            </li>
            <li>
              <a
                href="https://library.ucdavis.edu/library/"
                target="_blank"
                rel="noopener"
                >Visit the Library</a
              >
            </li>
            <li>
              <a
                href="https://library.ucdavis.edu/news/"
                target="_blank"
                rel="noopener"
                >Library News</a
              >
            </li>
            <li>
              <a
                href="http://give.ucdavis.edu/ULIB"
                target="_blank"
                rel="noopener"
                >Give to the Library</a
              >
            </li>
          </ul>
        </ucdlib-site-footer-column>
        <ucdlib-site-footer-column header="Account">
          <ul>
            <li><app-auth-footer></app-auth-footer></li>
            <li class="fin-admin" ?hidden="${!this.isAdmin}">
              <a href="/fin/admin/${this.pathInfo.length > 1 ? '#path-info' + this.pathInfo : ''}">Fin Admin</a>
            </li>
          </ul>
        </ucdlib-site-footer-column>
        <div insert-into="below-address" ?hidden="${this.showVersion}">
          <div><b>Build Information</b></div>
          <div>App Version: ${this.appVersion}</div>
          <div>Build Time: ${this.localBuildTime}</div>
          <div>Build Number: ${this.buildNum}</div>
          <div>Client Env: ${this.clientEnv}</div>
        </div>
      </ucdlib-site-footer>
    </div>
  </div>

`;}
