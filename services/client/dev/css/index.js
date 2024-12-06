// all global styles should be imported here
import sharedStyles from '@ucd-lib/theme-sass/style-ucdlib.css';
import brandCssProps from '@ucd-lib/theme-sass/css-properties.css';
import color from './color.css';
import fonts from './fonts.css';
import headings from './headings.css';
import layout from './layout.css';
import spacing from './spacing.css';
import text from './text.css';

const styles = `
  ${sharedStyles}
  ${brandCssProps}
  ${color}
  ${fonts}
  ${headings}
  ${layout}
  ${spacing}
  ${text}
`;

let sharedStyleElement = document.createElement('style');
sharedStyleElement.innerHTML = styles;
document.head.appendChild(sharedStyleElement);
