/** Render a chart only for an explicit, unambiguous two-column numeric data table.
 * Never infer numbers/units from prose, fabricate values, or interpret a map as a chart.
 */
export function englishBarChartData(
  table: { headers: string[]; rows: string[][] } | undefined,
) {
  if (
    !table ||
    table.headers.length !== 2 ||
    table.rows.length < 2 ||
    table.rows.length > 12
  )
    return null;
  const points = [];
  for (const row of table.rows) {
    if (
      row.length !== 2 ||
      !row[0].trim() ||
      row[0].length > 25 ||
      !/^\d+(?:\.\d+)?%?$/.test(row[1].trim())
    )
      return null;
    const value = Number(row[1].trim().replace(/%$/, ""));
    if (!Number.isFinite(value) || value > 1e9) return null;
    points.push({ label: row[0], display: row[1], value });
  }
  const percent = table.rows[0][1].trim().endsWith("%");
  if (
    table.rows.some((r) => r[1].trim().endsWith("%") !== percent) ||
    new Set(points.map((p) => p.label)).size !== points.length
  )
    return null;
  const max = Math.max(...points.map((p) => p.value));
  if (max <= 0) return null;
  return { label: table.headers[0], measure: table.headers[1], points, max };
}
