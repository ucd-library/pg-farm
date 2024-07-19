import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }

    .main-content {
      flex: 1;
      width: 100%;
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

  <ucd-theme-header
    site-name="PG Farm"
    slogan="Research Databases as a Service"
    figure-src=""
    prevent-fixed>
    <ucd-theme-primary-nav>
      <a href="/discover">Discover</a>
      <a href="/about">About</a>
    </ucd-theme-primary-nav>
  </ucd-theme-header>

  <div class="main-content">
    <ucdlib-pages
      selected="${this.page}"
      selectedAttribute="visible"
    >
      <div id="loading" ?hidden="${this.page}">
        <img src="/images/logos/logo-icon.svg" style="max-width: 128px" />
        <div class="loading-dots">
          <h1 class="dot one">.</h1>
          <h1 class="dot two">.</h1>
          <h1 class="dot three">.</h1>
        </div>
      </div>
      <app-home id="home"></app-home>
      <app-search id="search"></app-search>
    </ucdlib-pages>

    <div class="footer site-frame">
      <ucdlib-site-footer>
        <ucdlib-site-footer-column header="PG Farm">
          <ul>
            <li><a href="/search">Discover</a></li>
            <li><a href="/about">About PG Farm</a></li>
            <!-- <li><a href="">FAQ</a></li> -->
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