import { useMemo, useState, useRef } from 'react';

/**
 * Formats a currency value with comma separators and 2 decimal places.
 */
function formatCurrency(val) {
  const num = Number(val) || 0;
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats period labels into user-friendly short display strings.
 */
function formatPeriodDisplay(label) {
  if (!label) return '';
  const str = String(label).trim();

  // YYYY-MM-DD -> e.g. "Oct 21"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // YYYY-Www -> e.g. "Wk 42"
  if (/^\d{4}-W\d{2}$/.test(str)) {
    return 'Wk ' + str.split('-W')[1];
  }

  // YYYY-MM -> e.g. "Oct '26"
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [y, m] = str.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }

  return str;
}

/**
 * Continuous date zero-filling helper.
 * Fills every missing day with revenue: 0, cogs: 0, profit: 0, ordersCount: 0, unitsSold: 0.
 */
export function zeroFillContinuousData(rawList = [], granularity = 'daily', startDate = '', endDate = '') {
  if (!Array.isArray(rawList)) return [];

  if (granularity !== 'daily') {
    // For weekly and monthly, ensure at least 2 points so a spline can form
    if (rawList.length === 1) {
      const single = rawList[0];
      return [
        { ...single, periodLabel: single.periodLabel + ' (start)', revenue: 0, cogs: 0, profit: 0, ordersCount: 0, unitsSold: 0 },
        { ...single },
      ];
    }
    return rawList;
  }

  // DAILY ZERO-FILLING
  let start, end;
  if (startDate && endDate) {
    start = new Date(startDate + 'T00:00:00');
    end = new Date(endDate + 'T00:00:00');
  } else if (rawList.length > 0) {
    const validDates = rawList
      .map((d) => d.periodLabel)
      .filter((lbl) => /^\d{4}-\d{2}-\d{2}$/.test(lbl))
      .sort();

    if (validDates.length > 0) {
      start = new Date(validDates[0] + 'T00:00:00');
      end = new Date(validDates[validDates.length - 1] + 'T00:00:00');
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      if (diffDays < 6) {
        start = new Date(end);
        start.setDate(end.getDate() - 6);
      }
    } else {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 6);
    }
  } else {
    // Default 7 days
    end = new Date();
    start = new Date();
    start.setDate(end.getDate() - 6);
  }

  const lookup = new Map();
  for (const item of rawList) {
    if (item.periodLabel) {
      const key = item.periodLabel.substring(0, 10);
      lookup.set(key, item);
    }
  }

  const result = [];
  const curr = new Date(start);
  let guard = 0;
  while (curr <= end && guard < 180) {
    guard++;
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const existing = lookup.get(dateStr);
    if (existing) {
      result.push({
        ...existing,
        periodLabel: dateStr,
        revenue: Number(existing.revenue) || 0,
        cogs: Number(existing.cogs) || 0,
        profit: Number(existing.profit) || 0,
        ordersCount: Number(existing.ordersCount) || 0,
        unitsSold: Number(existing.unitsSold) || 0,
      });
    } else {
      result.push({
        periodLabel: dateStr,
        revenue: 0,
        cogs: 0,
        profit: 0,
        ordersCount: 0,
        unitsSold: 0,
      });
    }
    curr.setDate(curr.getDate() + 1);
  }

  return result;
}

/**
 * Computes Catmull-Rom cubic Bezier control points clamped at baseline.
 */
function buildSplinePath(points, baselineY, topPadding) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)} L ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  }

  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;

    // Clamp Y to prevent negative dip below baseline
    cp1y = Math.min(baselineY, Math.max(topPadding, cp1y));
    cp2y = Math.min(baselineY, Math.max(topPadding, cp2y));

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return d;
}

/**
 * Reusable Pure React/SVG Smooth Dual-Axis Spline Area & Dashed-Line Chart
 */
export default function SmoothSalesTrendChart({
  data = [],
  granularity = 'daily',
  onGranularityChange,
  granularityOptions = ['daily', 'weekly', 'monthly'],
  title = 'Sales & Revenue Trend',
  subtitle = 'Dual-axis performance wave: Revenue ($) vs. Order volume',
  activeFilterBadge = null,
  onClearFilter = null,
  startDate = '',
  endDate = '',
  height = 320,
  showProfitCurve: controlledProfit = undefined,
  onToggleProfit = null,
  className = '',
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [internalProfit, setInternalProfit] = useState(true);
  const containerRef = useRef(null);

  const showProfitCurve = controlledProfit !== undefined ? controlledProfit : internalProfit;
  const handleToggleProfit = onToggleProfit || (() => setInternalProfit((p) => !p));

  // 1. Zero-fill continuous data buckets
  const filledData = useMemo(() => {
    return zeroFillContinuousData(data, granularity, startDate, endDate);
  }, [data, granularity, startDate, endDate]);

  // 2. SVG Geometry dimensions
  const svgWidth = 860;
  const svgHeight = height;
  const paddingTop = 28;
  const paddingBottom = 42;
  const paddingLeft = 60;
  const paddingRight = 50;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;
  const baselineY = svgHeight - paddingBottom;

  // 3. Compute Scales
  const { maxRevenue, leftTicks, rightTicks, points } = useMemo(() => {
    if (filledData.length === 0) {
      return {
        maxRevenue: 100,
        maxOrders: 5,
        leftTicks: [0, 25, 50, 75, 100],
        rightTicks: [0, 1, 2, 3, 4, 5],
        points: [],
      };
    }

    const rawMaxRev = Math.max(...filledData.map((d) => d.revenue || 0), 0);
    const rawMaxProfit = showProfitCurve ? Math.max(...filledData.map((d) => d.profit || 0), 0) : 0;
    const peakRev = Math.max(rawMaxRev, rawMaxProfit, 10);

    // Auto-scale Left Y-axis (Currency)
    const targetRev = peakRev * 1.18;
    const magnitude = Math.pow(10, Math.floor(Math.log10(targetRev || 1)));
    const residual = targetRev / magnitude;
    let factor = 10;
    if (residual <= 1.2) factor = 1.2;
    else if (residual <= 2) factor = 2;
    else if (residual <= 2.5) factor = 2.5;
    else if (residual <= 5) factor = 5;
    const maxRevScaled = Math.max(Math.ceil(factor * magnitude), 20);

    const leftTicksArr = [];
    const tickSteps = 4;
    for (let i = 0; i <= tickSteps; i++) {
      leftTicksArr.push(Math.round((maxRevScaled / tickSteps) * i));
    }

    // Auto-scale Right Y-axis (Orders Count)
    const peakOrders = Math.max(...filledData.map((d) => d.ordersCount || 0), 1);
    const maxOrdersScaled = peakOrders <= 4 ? 4 : peakOrders <= 8 ? 8 : Math.ceil(peakOrders * 1.25);
    const rightTicksArr = [];
    for (let i = 0; i <= tickSteps; i++) {
      rightTicksArr.push(Math.round((maxOrdersScaled / tickSteps) * i));
    }

    // Map data to SVG Coordinates
    const count = filledData.length;
    const stepX = count > 1 ? plotWidth / (count - 1) : plotWidth / 2;

    const mapped = filledData.map((item, idx) => {
      const x = paddingLeft + idx * stepX;

      // Left Y-axis: Revenue
      const revRatio = Math.min(1, Math.max(0, (item.revenue || 0) / maxRevScaled));
      const yRev = baselineY - revRatio * plotHeight;

      // Left Y-axis: Profit
      const profitRatio = Math.min(1, Math.max(0, (item.profit || 0) / maxRevScaled));
      const yProfit = baselineY - profitRatio * plotHeight;

      // Right Y-axis: Orders
      const orderRatio = Math.min(1, Math.max(0, (item.ordersCount || 0) / maxOrdersScaled));
      const yOrders = baselineY - orderRatio * plotHeight;

      return {
        ...item,
        x,
        yRevenue: yRev,
        yProfit: yProfit,
        yOrders: yOrders,
      };
    });

    return {
      maxRevenue: maxRevScaled,
      maxOrders: maxOrdersScaled,
      leftTicks: leftTicksArr,
      rightTicks: rightTicksArr,
      points: mapped,
    };
  }, [filledData, showProfitCurve, plotWidth, plotHeight, baselineY, paddingLeft]);

  // 4. Generate SVG Paths
  const revenuePoints = useMemo(() => points.map((p) => ({ x: p.x, y: p.yRevenue })), [points]);
  const ordersPoints = useMemo(() => points.map((p) => ({ x: p.x, y: p.yOrders })), [points]);
  const profitPoints = useMemo(() => points.map((p) => ({ x: p.x, y: p.yProfit })), [points]);

  const splineRevenue = useMemo(() => buildSplinePath(revenuePoints, baselineY, paddingTop), [revenuePoints, baselineY, paddingTop]);
  const splineOrders = useMemo(() => buildSplinePath(ordersPoints, baselineY, paddingTop), [ordersPoints, baselineY, paddingTop]);
  const splineProfit = useMemo(() => buildSplinePath(profitPoints, baselineY, paddingTop), [profitPoints, baselineY, paddingTop]);

  const areaRevenue = useMemo(() => {
    if (!splineRevenue || points.length === 0) return '';
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${splineRevenue} L ${lastX.toFixed(2)},${baselineY} L ${firstX.toFixed(2)},${baselineY} Z`;
  }, [splineRevenue, points, baselineY]);

  // Active hover point
  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  // Decide how many X-axis labels to render so they don't collide
  const xLabelsToRender = useMemo(() => {
    if (points.length <= 10) return points.map((_, i) => i);
    const step = Math.ceil(points.length / 8);
    const indices = [];
    for (let i = 0; i < points.length; i += step) {
      indices.push(i);
    }
    if (indices[indices.length - 1] !== points.length - 1) {
      indices.push(points.length - 1);
    }
    return indices;
  }, [points]);

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 shadow-surface p-5 transition-all ${className}`}>
      {/* Top Header & Legend Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">{title}</h3>
            {activeFilterBadge && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-white shadow-sm">
                <span>{activeFilterBadge}</span>
                {onClearFilter && (
                  <button
                    type="button"
                    onClick={onClearFilter}
                    className="hover:text-neutral-300 ml-1 font-bold text-sm leading-none"
                    title="Clear filter"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Legend & Granularity Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Centered Legend Dots */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-neutral-900 inline-block shadow-sm"></span>
              <span className="font-semibold text-neutral-800">Sales ($)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-neutral-500 inline-block"></span>
              <span className="font-medium text-neutral-600">Orders</span>
            </div>
            <button
              type="button"
              onClick={handleToggleProfit}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium transition-all cursor-pointer ${
                showProfitCurve
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100'
              }`}
              title="Toggle Gross Profit curve"
            >
              <span className={`w-2 h-2 rounded-full ${showProfitCurve ? 'bg-emerald-400' : 'bg-neutral-400'}`}></span>
              <span>Gross Profit ($)</span>
            </button>
          </div>

          {/* Granularity Pill / Tabs */}
          {onGranularityChange && granularityOptions && granularityOptions.length > 0 && (
            <div className="inline-flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
              {granularityOptions.map((opt) => {
                const isActive = granularity.toLowerCase() === opt.toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onGranularityChange(opt.toLowerCase())}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider transition-all ${
                      isActive
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {!onGranularityChange && (
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-neutral-100 text-neutral-700 uppercase tracking-wider border border-neutral-200">
              {granularity} Activity
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden" ref={containerRef}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block select-none"
          preserveAspectRatio="none"
          style={{ maxHeight: `${svgHeight}px`, minHeight: '240px' }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Linear gradient for Sales Area fill fading from 0.28 to 0.0 */}
            <linearGradient id="salesWaveAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#171717" stopOpacity="0.28" />
              <stop offset="65%" stopColor="#171717" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#171717" stopOpacity="0.0" />
            </linearGradient>

            {/* Linear gradient for Profit Area fill (optional) */}
            <linearGradient id="profitWaveAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Left/Right Ticks */}
          {leftTicks.map((val, idx) => {
            const ratio = maxRevenue > 0 ? val / maxRevenue : 0;
            const y = baselineY - ratio * plotHeight;
            const rightVal = rightTicks[idx] !== undefined ? rightTicks[idx] : '';

            return (
              <g key={`grid-${idx}`}>
                {/* Horizontal line */}
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? undefined : '3 3'}
                />

                {/* Left Y-Axis Label ($ Currency) */}
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#94a3b8"
                  fontWeight="500"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                </text>

                {/* Right Y-Axis Label (Orders Count) */}
                <text
                  x={svgWidth - paddingRight + 8}
                  y={y + 4}
                  textAnchor="start"
                  fontSize="11"
                  fill="#94a3b8"
                  fontWeight="500"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {rightVal}
                </text>
              </g>
            );
          })}

          {/* Baseline X-axis Rule */}
          <line
            x1={paddingLeft}
            y1={baselineY}
            x2={svgWidth - paddingRight}
            y2={baselineY}
            stroke="#cbd5e1"
            strokeWidth="1.25"
          />

          {/* Series 1: Area Fill underneath Sales Revenue */}
          {areaRevenue && (
            <path
              d={areaRevenue}
              fill="url(#salesWaveAreaGrad)"
              className="transition-opacity duration-300"
            />
          )}

          {/* Series 1: Smooth Solid Spline Curve for Sales Revenue */}
          {splineRevenue && (
            <path
              d={splineRevenue}
              fill="none"
              stroke="#171717"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Optional Profit Curve */}
          {showProfitCurve && splineProfit && (
            <path
              d={splineProfit}
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Series 2: Smooth Dashed Spline Curve for Orders Count */}
          {splineOrders && (
            <path
              d={splineOrders}
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Circular Data Markers */}
          {points.map((p, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g key={`marker-${idx}`}>
                {/* Revenue point circle */}
                <circle
                  cx={p.x}
                  cy={p.yRevenue}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#171717"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-150 cursor-pointer"
                />

                {/* Orders count circle */}
                <circle
                  cx={p.x}
                  cy={p.yOrders}
                  r={isHovered ? 4.5 : 3}
                  fill="#64748b"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all duration-150 cursor-pointer"
                />
              </g>
            );
          })}

          {/* Bottom X-Axis Labels */}
          {xLabelsToRender.map((ptIdx) => {
            const p = points[ptIdx];
            if (!p) return null;
            return (
              <text
                key={`xlabel-${ptIdx}`}
                x={p.x}
                y={baselineY + 18}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
                fontWeight="500"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {formatPeriodDisplay(p.periodLabel)}
              </text>
            );
          })}

          {/* Active Hover Crosshair Line */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={baselineY}
              stroke="#94a3b8"
              strokeWidth="1.25"
              strokeDasharray="3 3"
              pointerEvents="none"
            />
          )}

          {/* Invisible Vertical Hit Columns for Smooth Mouse Hovering */}
          {points.map((p, idx) => {
            const stepX = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;
            const colWidth = Math.max(stepX, 12);
            const colX = p.x - colWidth / 2;

            return (
              <rect
                key={`hit-${idx}`}
                x={colX}
                y={paddingTop}
                width={colWidth}
                height={plotHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseMove={() => setHoveredIndex(idx)}
              />
            );
          })}
        </svg>

        {/* Floating Dark Monochrome Tooltip */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-100 ease-out"
            style={{
              left: `${Math.min(
                Math.max(10, ((activePoint.x) / svgWidth) * 100),
                82
              )}%`,
              top: `${Math.min(Math.max(10, ((activePoint.yRevenue - 15) / svgHeight) * 100), 55)}%`,
              transform: activePoint.x > svgWidth * 0.7 ? 'translate(-105%, -50%)' : 'translate(12px, -50%)',
            }}
          >
            <div className="bg-neutral-900/95 backdrop-blur-md text-white rounded-lg p-3 shadow-xl border border-neutral-700/60 min-w-[160px] text-xs">
              <div className="font-bold text-neutral-200 border-b border-neutral-800 pb-1.5 mb-2 flex items-center justify-between">
                <span>{formatPeriodDisplay(activePoint.periodLabel)}</span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {activePoint.periodLabel}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
                    Sales:
                  </span>
                  <span className="font-bold text-white tracking-wide">
                    {formatCurrency(activePoint.revenue)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    Profit:
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {formatCurrency(activePoint.profit)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[11px]">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <span className="w-2 h-0.5 border-t border-dashed border-neutral-400 inline-block"></span>
                    Orders:
                  </span>
                  <span className="font-medium text-neutral-200">
                    {activePoint.ordersCount || 0}{' '}
                    <span className="text-neutral-500 font-normal">
                      ({activePoint.unitsSold || 0} units)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
