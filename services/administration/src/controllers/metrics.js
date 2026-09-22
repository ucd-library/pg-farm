import client from '../../../lib/pg-admin-client.js';

/**
 * @function escapeLabelValue
 * @description escape a label value per the Prometheus exposition format spec
 *
 * @param {*} value label value to escape
 * @returns {String}
 */
function escapeLabelValue(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * @function formatLabels
 * @description format a labels object as a Prometheus label string, eg {a="1",b="2"}
 *
 * @param {Object} labels labels for a single metric sample
 * @returns {String}
 */
function formatLabels(labels) {
  let keys = Object.keys(labels || {});
  if( keys.length === 0 ) return '';

  let parts = keys.map(key => `${key}="${escapeLabelValue(labels[key])}"`);
  return '{'+parts.join(',')+'}';
}

/**
 * @function renderPrometheusText
 * @description render rows from pgfarm.metric_snapshot as Prometheus exposition format
 * text. Each distinct metric name emits a single HELP/TYPE header (from its first row),
 * followed by one sample line per row using that row's labels - rows are pushed by every
 * metrics-enabled pg-farm process (gateway, health-probe, administration, ...), so this
 * is effectively a merge of every process's metrics into one page.
 *
 * @param {Array<Object>} rows rows from pgfarm.metric_snapshot
 * @returns {String}
 */
function renderPrometheusText(rows) {
  let byName = new Map();
  for( let row of rows ) {
    if( !byName.has(row.metric_name) ) {
      byName.set(row.metric_name, []);
    }
    byName.get(row.metric_name).push(row);
  }

  let lines = [];
  for( let [name, metricRows] of byName ) {
    let first = metricRows[0];
    lines.push(`# HELP ${name} ${first.help_text}`);
    lines.push(`# TYPE ${name} ${first.metric_type}`);
    for( let row of metricRows ) {
      lines.push(`${name}${formatLabels(row.labels)} ${row.value}`);
    }
  }

  return lines.join('\n')+'\n';
}

/**
 * @function getMetricsText
 * @description read all current metric snapshots from every reporting pg-farm process and
 * render them as a single Prometheus exposition format text page.
 *
 * @returns {Promise<String>}
 */
async function getMetricsText() {
  let rows = await client.getMetricSnapshots();
  return renderPrometheusText(rows);
}

export {getMetricsText};
