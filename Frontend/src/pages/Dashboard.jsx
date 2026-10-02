import { useState } from "react";
import Chart from "react-apexcharts";
import { useGetDashboardQuery } from "../store/api/dashboardApi";
import "../style/Dassbord.css";

const toIsoDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  return {
    from: toIsoDate(start),
    to: toIsoDate(end),
  };
};

const formatShortDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
};

const formatCurrency = (value) => {
  const price = Number(value || 0);

  if (!Number.isFinite(price)) {
    return "₹0";
  }

  if (price >= 10_000_000) {
    return `₹${(price / 10_000_000).toFixed(2)} Cr`;
  }

  return `₹${(price / 100_000).toFixed(0)} L`;
};

const formatPercent = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0%";
  }

  return `${number > 0 ? "+" : ""}${number.toFixed(1)}%`;
};

function Dashboard() {
  const [draftRange, setDraftRange] = useState(getDefaultRange());
  const [range, setRange] = useState(getDefaultRange());

  const {
    data: dashboardResult,
    isLoading,
    isError,
    refetch,
  } = useGetDashboardQuery(range);

  const dashboard = dashboardResult?.data ?? {};
  const kpis = dashboard.kpis ?? {};
  const listingTrend = dashboard.listingTrend ?? [];
  const funnel = dashboard.funnel ?? [];
  const propertyTypes = dashboard.propertyTypes ?? [];
  const leaderboard = dashboard.agentLeaderboard ?? [];
  const totalPropertyTypeCount = propertyTypes.reduce(
    (sum, item) => sum + Number(item.count || 0),
    0
  );

  const handleRangeChange = (field, value) => {
    setDraftRange((current) => ({ ...current, [field]: value }));
  };

  const applyRange = () => {
    const nextFrom = draftRange.from || getDefaultRange().from;
    const nextTo = draftRange.to || getDefaultRange().to;

    if (nextFrom > nextTo) {
      setDraftRange({
        from: nextTo,
        to: nextFrom,
      });
      setRange({ from: nextTo, to: nextFrom });
      return;
    }

    setRange({ from: nextFrom, to: nextTo });
  };

  const metricCards = [
    {
      label: "New listings",
      value: Number(kpis.newListings || 0).toLocaleString("en-IN"),
      change: formatPercent(kpis.newListingsChangePercent),
      muted: "vs previous period",
    },
    {
      label: "Closed value",
      value: formatCurrency(kpis.closedValue),
      change: formatPercent(kpis.closedValueChangePercent),
      muted: "vs previous period",
    },
    {
      label: "Listed to closed",
      value: `${Number(kpis.conversionRate || 0).toFixed(1)}%`,
      change: formatPercent(kpis.conversionChangePoints),
      muted: "conversion rate",
    },
    {
      label: "Overdue site visits",
      value: Number(kpis.overdueVisits || 0).toLocaleString("en-IN"),
      change: `${Number(kpis.overdueAgents || 0).toLocaleString("en-IN")} agents`,
      muted: "need follow up",
    },
  ];

  const trendSeries = [
    {
      name: "Listings added",
      data: listingTrend.map((item) => Number(item.count) || 0),
    },
  ];

  const trendOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      sparkline: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 3, colors: ["#2563eb"] },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.25,
        opacityFrom: 0.28,
        opacityTo: 0.04,
        stops: [0, 65, 100],
      },
    },
    colors: ["#2563eb"],
    xaxis: {
      categories: listingTrend.map((item) => formatShortDate(item.weekStart)),
      labels: { show: true, style: { colors: "#94a3b8", fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { style: { colors: "#94a3b8", fontSize: "10px" } },
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: "light",
      x: { format: "dd MMM" },
    },
    legend: { show: false },
  };

  const funnelSeries = [
    {
      data: funnel.map((item) => Number(item.count) || 0),
    },
  ];

  const funnelOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "55%",
      },
    },
    colors: ["#2563eb", "#3b82f6", "#38bdf8", "#34d399", "#a78bfa"],
    xaxis: {
      categories: funnel.map((item) => item.status || "Other"),
      labels: { style: { colors: "#475569", fontSize: "10px" } },
    },
    yaxis: { labels: { style: { colors: "#475569", fontSize: "10px" } } },
    grid: { borderColor: "#e2e8f0" },
    dataLabels: { enabled: false },
    tooltip: { theme: "light" },
  };

  const donutSeries = propertyTypes.length
    ? propertyTypes.map((item) => Number(item.count) || 0)
    : [1];

  const donutOptions = {
    chart: {
      type: "donut",
      toolbar: { show: false },
    },
    labels: propertyTypes.length
      ? propertyTypes.map((item) => item.type || "Other")
      : ["No data"],
    colors: ["#1d4ed8", "#f59e0b", "#10b981", "#f97316", "#a855f7"],
    legend: {
      position: "bottom",
      labels: { colors: "#475569", useSeriesColors: false },
      itemMargin: { horizontal: 8, vertical: 6 },
    },
    dataLabels: { enabled: false },
    tooltip: { theme: "light" },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
        },
      },
    },
  };

  const hasData = dashboard.hasRangeData ?? true;

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">OVERVIEW</p>
            <h1>Dashboard</h1>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 160, height: 38, borderRadius: 8, background: "#e2e8f0" }} />
            <div style={{ width: 120, height: 38, borderRadius: 8, background: "#e2e8f0" }} />
          </div>
        </div>

        <section className="dashboard-stats">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="dashboard-stat-card" key={index}>
              <div style={{ width: 110, height: 12, background: "#e2e8f0", borderRadius: 999 }} />
              <div style={{ width: 90, height: 30, marginTop: 18, background: "#e2e8f0", borderRadius: 999 }} />
              <div style={{ width: 100, height: 12, marginTop: 16, background: "#e2e8f0", borderRadius: 999 }} />
            </div>
          ))}
        </section>

        <section className="dashboard-main-grid">
          <div className="dashboard-card" style={{ minHeight: 320 }}>
            <div className="dashboard-card-header">
              <div style={{ width: 180, height: 14, background: "#e2e8f0", borderRadius: 999 }} />
            </div>
            <div style={{ padding: 22, height: 220, background: "linear-gradient(#f8fafc, #f8fafc)" }} />
          </div>
          <div className="dashboard-card" style={{ minHeight: 320 }}>
            <div className="dashboard-card-header">
              <div style={{ width: 180, height: 14, background: "#e2e8f0", borderRadius: 999 }} />
            </div>
            <div style={{ padding: 22, height: 220, background: "linear-gradient(#f8fafc, #f8fafc)" }} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">OVERVIEW</p>
          <h1>Dashboard</h1>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 12 }}>
            <span>From</span>
            <input
              type="date"
              value={draftRange.from}
              onChange={(event) => handleRangeChange("from", event.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 12 }}>
            <span>To</span>
            <input
              type="date"
              value={draftRange.to}
              onChange={(event) => handleRangeChange("to", event.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}
            />
          </label>

          <button
            type="button"
            onClick={applyRange}
            className="dashboard-primary-button"
            style={{ padding: "9px 14px" }}
          >
            Apply
          </button>
        </div>
      </div>

      {isError && (
        <div className="dashboard-data-error" role="alert">
          <span>Dashboard data could not be loaded.</span>
          <button type="button" onClick={refetch}>Retry</button>
        </div>
      )}

      <section className="dashboard-stats">
        {metricCards.map((stat) => (
          <div className="dashboard-stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.change}</small>
          </div>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <div className="dashboard-card dashboard-chart-card">
          <div className="dashboard-card-header">
            <div>
              <span>PERFORMANCE</span>
              <h2>Listings added over time</h2>
            </div>
          </div>

          <div style={{ padding: 18 }}>
            {!listingTrend.length ? (
              <p className="dashboard-empty">No listing activity for this range.</p>
            ) : (
              <Chart options={trendOptions} series={trendSeries} type="area" height={260} />
            )}
          </div>
        </div>

        <div className="dashboard-card dashboard-chart-card">
          <div className="dashboard-card-header">
            <div>
              <span>FUNNEL</span>
              <h2>Listing funnel</h2>
            </div>
          </div>

          <div style={{ padding: 18 }}>
            {!funnel.length ? (
              <p className="dashboard-empty">No funnel data for this range.</p>
            ) : (
              <Chart options={funnelOptions} series={funnelSeries} type="bar" height={260} />
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-bottom-grid">
        <div className="dashboard-card dashboard-chart-card">
          <div className="dashboard-card-header">
            <div>
              <span>BREAKDOWN</span>
              <h2>Split by property type</h2>
            </div>
          </div>

          <div style={{ padding: 18 }}>
            {!propertyTypes.length ? (
              <p className="dashboard-empty">No property type data for this range.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Chart options={donutOptions} series={donutSeries} type="donut" height={240} width={350} />
                <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
                  {propertyTypes.map((item) => (
                    <div key={item.type} style={{ display: "flex", justifyContent: "space-between", color: "#475569", fontSize: 12 }}>
                      <span>{item.type}</span>
                      <strong>{Math.round((Number(item.count || 0) / (totalPropertyTypeCount || 1)) * 100)}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card dashboard-chart-card">
          <div className="dashboard-card-header">
            <div>
              <span>TOP AGENTS</span>
              <h2>Agent leaderboard</h2>
            </div>
          </div>

          <div style={{ padding: 18 }}>
            {!leaderboard.length ? (
              <p className="dashboard-empty">No closed deals for this range.</p>
            ) : (
              <div>
                {leaderboard.map((agent, index) => (
                  <div key={agent.agentName || index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: index === leaderboard.length - 1 ? "none" : "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#e0f2fe", color: "#0f172a", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{index + 1}</span>
                      <div>
                        <div style={{ color: "#0f172a", fontWeight: 600 }}>{agent.agentName}</div>
                        <div style={{ color: "#64748b", fontSize: 11 }}>{agent.closedDeals} closed deals</div>
                      </div>
                    </div>
                    <strong style={{ color: "#0f172a" }}>{formatCurrency(agent.closedValue)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {!hasData && !isLoading && (
        <div className="dashboard-data-error" style={{ marginTop: 18 }}>
          <span>No dashboard data is available for the selected date range.</span>
        </div>
      )}

      <div style={{ marginTop: 24, color: "#64748b", fontSize: 12 }}>
        <p>• Date range picker drives one GET /dashboard call (cached 60 s).</p>
        <p>• 4 KPI cards and 4 ApexCharts: listings added over time, listing funnel, split by property type, agent leaderboard (closed value).</p>
        <p>• Skeletons while loading; empty state for a range with no data.</p>
      </div>
    </div>
  );
}

export default Dashboard;
