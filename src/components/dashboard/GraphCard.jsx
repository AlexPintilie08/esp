import LiveTickerChart from "./LiveTickerChart";

export default function GraphCard({
  title,
  liveValue,
  liveUnit,
  minLabel,
  maxLabel,
  footerLabel,
  values = [],
  ticks = [],
  color = "#52ab98",
  minValue = 0,
  maxValue = 100,
  darkMode = false,
  expanded = false,
  onToggle,
  detailContent = null,
}) {
  return (
    <div
      className={`panel panel-large graph-panel ${expanded ? "is-expanded" : ""}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle?.();
        }
      }}
    >
      <div className="graph-live-block">
        <div className="graph-live-value">
          <span className="live-number">{liveValue}</span>
          <span className="live-unit">{liveUnit}</span>
        </div>

        <div className="graph-live-meta">
          <div className="graph-meta-line">
            <span className="graph-small-label">max</span>
            <span className="graph-small-value">{maxLabel}</span>
          </div>

          <div className="graph-meta-line">
            <span className="graph-small-label">min</span>
            <span className="graph-small-value">{minLabel}</span>
          </div>

          <div className="graph-meta-line live-under-min">
            <span className="graph-small-label">{title}</span>
          </div>
        </div>
      </div>

      <div className="graph-area">
        <div className="y-scale">
          {ticks
            .slice()
            .reverse()
            .map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
        </div>

        <LiveTickerChart
          values={values}
          color={color}
          minValue={minValue}
          maxValue={maxValue}
          darkMode={darkMode}
        />
      </div>

      <div className="graph-bottom">
        <span className="graph-small-label live-under-min">{footerLabel}</span>
      </div>

      {expanded && detailContent ? (
        <div className="card-detail detail-overlay-inline">{detailContent}</div>
      ) : null}
    </div>
  );
}