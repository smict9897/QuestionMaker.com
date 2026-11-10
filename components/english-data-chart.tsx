import { englishBarChartData } from "@/lib/english/chart-data";
export default function EnglishDataChart({
  table,
}: {
  table: { headers: string[]; rows: string[][] } | undefined;
}) {
  const data = englishBarChartData(table);
  if (!data) return null;
  const width = 640,
    rowHeight = 35,
    height = data.points.length * rowHeight + 58;
  return (
    <figure
      className="english-data-chart"
      aria-label={`Bar chart: ${data.measure}`}
    >
      <figcaption>{data.measure}</figcaption>
      <svg
        role="img"
        aria-label={`Bar chart of ${data.measure}. Exact values are also provided in the following table.`}
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>{data.measure}</title>
        {data.points.map((point, i) => {
          const y = 20 + i * rowHeight;
          return (
            <g key={point.label}>
              <text x={145} y={y + 18} textAnchor="end" fontSize={12}>
                {point.label}
              </text>
              <rect
                x={155}
                y={y + 2}
                width={(point.value / data.max) * 390}
                height={24}
                fill="#d1d5db"
                stroke="#111"
              />
              <text
                x={165 + (point.value / data.max) * 390}
                y={y + 18}
                fontSize={12}
              >
                {point.display}
              </text>
            </g>
          );
        })}
        <line x1={155} y1={12} x2={155} y2={height - 30} stroke="#111" />
        <text x={155} y={height - 10} fontSize={12}>
          0
        </text>
        <text x={545} y={height - 10} fontSize={12} textAnchor="end">
          {data.max}
        </text>
      </svg>
    </figure>
  );
}
