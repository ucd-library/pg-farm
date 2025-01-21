// all global styles should be imported here
import sharedStyles from '@ucd-lib/theme-sass/style-ucdlib.css';
import brandCssProps from '@ucd-lib/theme-sass/css-properties.css';
import color from './color.css';
import cssProps from './css-props.css';
import fonts from './fonts.css';
import forms from './forms.css';
import headings from './headings.css';
import icons from './icons.css';
import layout from './layout.css';
import pageHeader from './page-header.css';
import site from './site.css';
import spacing from './spacing.css';
import text from './text.css';

const styles = `
  ${sharedStyles}
  ${brandCssProps}
  ${cssProps}
  ${color}
  ${fonts}
  ${forms}
  ${headings}
  ${icons}
  ${layout}
  ${pageHeader}
  ${site}
  ${spacing}
  ${text}
`;

let sharedStyleElement = document.createElement('style');
sharedStyleElement.innerHTML = styles;
document.head.appendChild(sharedStyleElement);
