import { html } from 'lit';

/**
 * @description Set the width of an element to the width of the text
 * @param {String} id - The id of the element to target
 * @param {String} text - The text to measure
 * @param {Number} buffer - The buffer to add to the width
 * @returns {TemplateResult}
 */
export function elementChWidth(id, text, buffer=1){
  if ( !id || !text ) return html``;
  return html`
    <style>
      ${'#' + id} {
        width: ${text.length + buffer + 'ch'};
      }
    </style>
  `;
}
