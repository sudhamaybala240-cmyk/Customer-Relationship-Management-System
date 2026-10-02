import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getAccessToken } from "../store/authToken";
import {
  useBulkUpdatePropertiesMutation,
  useGetPropertiesQuery,
  useGetPropertyFiltersQuery,
} from "../store/api/propertyApi";
import "../style/property.css";

const MAX_PRICE = 20_000_000;
const PRICE_STEP = 500_000;

const STATUSES = [
  "Draft",
  "Listed",
  "Site visit",
  "Negotiation",
  "Closed",
  "Withdrawn",
];
const AMENITIES = ["Parking", "Lift", "Security", "Swimming Pool", "Gym", "Club House", "Power Backup", "Garden", "CCTV"];

const PROPERTY_COLUMNS = [
  { key: "property", label: "Property" },
  { key: "locality", label: "Locality" },
  { key: "bhk", label: "BHK" },
  { key: "area", label: "Area sq ft" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
  { key: "agent", label: "Agent" },
  { key: "updated", label: "Updated" },
];

function formatPrice(value) {
  if (value >= 10_000_000) {
    return `₹${(value / 10_000_000)
      .toFixed(2)
      .replace(/\.00$/, "")} Cr`;
  }

  return `₹${(value / 100_000).toFixed(0)} L`;
}

function parseNumber(value, fallback) {
  if (value === null || value.trim() === "") {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function getRows(result) {
  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.data?.rows)) {
    return result.data.rows;
  }

  if (Array.isArray(result?.data?.items)) {
    return result.data.items;
  }

  if (Array.isArray(result?.items)) {
    return result.items;
  }

  if (Array.isArray(result?.rows)) {
    return result.rows;
  }

  return [];
}

function getTotal(result, fallback) {
  const value =
    result?.total ??
    result?.data?.total ??
    result?.pagination?.total ??
    result?.data?.pagination?.total;

  const total = Number(value);

  return Number.isFinite(total) ? total : fallback;
}

function getPropertyName(item) {
  return (
    item?.title ||
    item?.name ||
    `${item?.buildingName || "Property"}${
      item?.unitNo ? ` · ${item.unitNo}` : ""
    }`
  );
}

function getListingType(item) {
  const value = item?.listingType || item?.listing || "";
  return value === "SALE" ? "Sale" : value === "RENT" ? "Rent" : value;
}

function getType(item) {
  return item?.type || item?.propertyType || "";
}

function getLocality(item) {
  return item?.locality || "";
}

function getAgent(item) {
  return (
    item?.assignee?.name ||
    item?.assigneeName ||
    item?.agent ||
    "Unassigned"
  );
}

function getStatus(item) {
  return item?.status || "";
}

function getBhk(item) {
  return Number(item?.bhk || 0);
}

function getArea(item) {
  return Number(
    item?.carpetAreaSqft ||
      item?.carpetArea ||
      item?.area ||
      0
  );
}

function getPrice(item) {
  return Number(
    item?.priceInr ||
      item?.price ||
      0
  );
}

function getUpdated(item) {
  if (item?.updated) {
    return item.updated;
  }

  if (item?.updatedAt) {
    return new Date(item.updatedAt).toLocaleString("en-IN");
  }

  return "";
}

function createQueryParams({
  search,
  listing,
  type,
  bhk,
  locality,
  agent,
  minPrice,
  maxPrice,
  page,
  rowsPerPage,
  sortBy,
  sortOrder,
  siteVisitsOnly,
}) {
  const params = {
    page: page + 1,
    limit: rowsPerPage,
    sortBy,
    sortOrder,
  };

  if (search.trim()) {
    params.q = search.trim();
  }

  if (listing) {
    params.listingType = listing;
  }

  if (type) {
    params.type = type;
  }

  if (bhk.length) {
    params.bhk = bhk.join(",");
  }

  if (locality !== "Any locality") {
    params.locality = locality;
  }

  if (agent) {
    params.assigneeId = agent;
  }

  if (minPrice > 0) {
    params.minPrice = minPrice;
  }

  if (maxPrice < MAX_PRICE) {
    params.maxPrice = maxPrice;
  }

  if (siteVisitsOnly) {
    params.status = "Site visit";
  }

  return params;
}

function Properties() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useSelector((state) => state.auth.user);
  const columnStorageKey = `propflow:property-columns:${currentUser?.id || currentUser?.email || "default"}`;

  const [selected, setSelected] = useState([]);
  const [dialog, setDialog] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(columnStorageKey);
      const parsed = saved ? JSON.parse(saved) : null;
      const allColumns = PROPERTY_COLUMNS.map(({ key }) => key);
      const savedColumns = Array.isArray(parsed)
        ? allColumns.filter((key) => parsed.includes(key))
        : [];
      return savedColumns.length ? savedColumns : allColumns;
    } catch {
      return PROPERTY_COLUMNS.map(({ key }) => key);
    }
  });

  const [bulkUpdateProperties] = useBulkUpdatePropertiesMutation();
  const { data: filterOptionsResult } = useGetPropertyFiltersQuery();

  const search = searchParams.get("q") || "";
  const listing = searchParams.get("listingType") || "";
  const type = searchParams.get("type") || "";
  const locality = searchParams.get("locality") || "Any locality";
  const agent = searchParams.get("assignee") || "";

  const bhk = useMemo(() => {
    const value = searchParams.get("bhk");

    if (!value) {
      return [];
    }

    return value
      .split(",")
      .map(Number)
      .filter(Number.isFinite);
  }, [searchParams]);

  const minPrice = parseNumber(
    searchParams.get("minPrice"),
    0
  );

  const maxPrice = parseNumber(
    searchParams.get("maxPrice"),
    MAX_PRICE
  );

  const limitValue = parseNumber(searchParams.get("limit"), 25);
  const rowsPerPage = [10, 25, 50, 100].includes(limitValue)
    ? limitValue
    : 25;

  const pageValue = searchParams.get("page");
  const page = Math.max(
    0,
    parseNumber(pageValue, 1) - 1
  );

  const sortBy = searchParams.get("sortBy") || "title";
  const sortOrder = searchParams.get("sortOrder") || "asc";

  const ascending = sortOrder === "asc";

  const siteVisitsOnly =
    searchParams.get("status") === "Site visit";

  const queryParams = useMemo(
    () =>
      createQueryParams({
        search,
        listing,
        type,
        bhk,
        locality,
        agent,
        minPrice,
        maxPrice,
        page,
        rowsPerPage,
        sortBy,
        sortOrder,
        siteVisitsOnly,
      }),
    [
      search,
      listing,
      type,
      bhk,
      locality,
      agent,
      minPrice,
      maxPrice,
      page,
      rowsPerPage,
      sortBy,
      sortOrder,
      siteVisitsOnly,
    ]
  );

  const {
    data: propertyResult,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetPropertiesQuery(queryParams);

  const agents = filterOptionsResult?.data?.agents || [];
  const localities = filterOptionsResult?.data?.localities || [];
  const statusOptions = filterOptionsResult?.data?.statuses?.length
    ? filterOptionsResult.data.statuses
    : STATUSES;
  const amenityOptions = filterOptionsResult?.data?.amenities?.length
    ? filterOptionsResult.data.amenities
    : AMENITIES;
  const shownColumns = PROPERTY_COLUMNS.filter(({ key }) =>
    visibleColumns.includes(key)
  );

  useEffect(() => {
    localStorage.setItem(columnStorageKey, JSON.stringify(visibleColumns));
  }, [columnStorageKey, visibleColumns]);

  const properties = useMemo(
    () => getRows(propertyResult),
    [propertyResult]
  );

  const total = getTotal(
    propertyResult,
    properties.length
  );

  const pageCount = Math.max(
    1,
    Math.ceil(total / rowsPerPage)
  );

  const visibleIds = properties.map(
    (item) => item.id
  );

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) =>
      selected.includes(id)
    );

  const updateParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(
        searchParams
      );

      Object.entries(updates).forEach(
        ([key, value]) => {
          if (
            value === undefined ||
            value === null ||
            value === ""
          ) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        }
      );

      setSearchParams(next, {
        replace: true,
      });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    const validPage = Math.min(
      page,
      Math.max(0, pageCount - 1)
    );

    if (
      validPage !== page ||
      (pageValue !== null &&
        (!Number.isFinite(Number(pageValue)) ||
          Number(pageValue) < 1))
    ) {
      updateParams({
        page: validPage + 1,
      });
    }
  }, [page, pageCount, pageValue, updateParams]);

  const updateFilter = (key, value) => {
    updateParams({
      [key]: value,
      page: 1,
    });
  };

  const clearFilters = () => {
    const next = new URLSearchParams();

    next.set("page", "1");
    next.set("limit", String(rowsPerPage));
    next.set("sortBy", sortBy);
    next.set("sortOrder", sortOrder);

    setSearchParams(next, {
      replace: true,
    });
  };

  const toggleSelected = (id) => {
    if (!selected.includes(id) && selected.length >= 100) {
      setFeedback("Select up to 100 properties for one bulk action.");
      return;
    }

    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleVisible = () => {
    if (allVisibleSelected) {
      setSelected((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    const next = [...new Set([...selected, ...visibleIds])];
    if (next.length > 100) {
      setFeedback("Select up to 100 properties for one bulk action.");
    }
    setSelected(next.slice(0, 100));
  };

  const toggleBhk = (value) => {
    const next = bhk.includes(value)
      ? bhk.filter((item) => item !== value)
      : [...bhk, value];

    updateFilter(
      "bhk",
      next.length ? next.join(",") : ""
    );
  };

  const toggleSort = () => {
    updateParams({
      sortBy: "title",
      sortOrder: ascending ? "desc" : "asc",
      page: 1,
    });
  };

  const openProperty = (id) => {
    navigate(`/properties/${id}`);
  };

  const startBulkAction = (action) => {
    if (!selected.length) {
      return;
    }

    if (action === "agent" && !agents.length) {
      setFeedback("No agents are available to assign these properties to.");
      return;
    }

    setBulkValue(
      action === "agent"
        ? agents[0]?.id || ""
        : action === "status"
        ? statusOptions[0] || "Listed"
        : amenityOptions[0] || "Parking"
    );

    setDialog(action);
  };

  const applyBulkAction = async (event) => {
    event.preventDefault();
    const payload = { ids: selected };

    if (dialog === "agent") payload.assigneeId = bulkValue || null;
    if (dialog === "status") payload.status = bulkValue;
    if (dialog === "amenity") payload.amenity = bulkValue.trim();

    setIsBulkUpdating(true);
    try {
      const result = await bulkUpdateProperties(payload).unwrap();
      setFeedback(`Updated ${result.updatedCount} properties.`);
      setSelected([]);
      setDialog("");
    } catch (error) {
      setFeedback(
        error?.data?.message || "Could not update the selected properties."
      );
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const exportWorkbook = async () => {
    if (!total) {
      setFeedback(
        "There are no properties matching the current filters to export."
      );
      return;
    }

    setIsExporting(true);

    try {
      const params = new URLSearchParams(
        Object.entries(queryParams).map(([key, value]) => [key, String(value)])
      );
      const token = getAccessToken();
      const response = await fetch(
        `/api/export/properties?${params.toString()}`,
        {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) throw new Error("Export request failed");

      const url = URL.createObjectURL(await response.blob());
      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download = "propflow-properties.xlsx";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback(`Exported ${total} matching properties.`);
    } catch (error) {
      setFeedback(
        error?.message || "Could not export the workbook. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const filters = [
    listing && {
      label: listing,
      clear: () =>
        updateFilter("listingType", ""),
    },
    type && {
      label: type,
      clear: () => updateFilter("type", ""),
    },
    bhk.length > 0 && {
      label: `${[...bhk].sort().map((value) => value === 4 ? "4+" : value).join("–")} BHK`,
      clear: () => updateFilter("bhk", ""),
    },
    (minPrice > 0 ||
      maxPrice < MAX_PRICE) && {
      label: `${formatPrice(
        minPrice
      )} – ${formatPrice(maxPrice)}`,
      clear: () => {
        const next = new URLSearchParams(
          searchParams
        );

        next.delete("minPrice");
        next.delete("maxPrice");
        next.set("page", "1");

        setSearchParams(next, {
          replace: true,
        });
      },
    },
    locality !== "Any locality" && {
      label: locality,
      clear: () =>
        updateFilter("locality", ""),
    },
    agent && {
      label: agents.find((item) => item.id === agent)?.name || "Assigned agent",
      clear: () =>
        updateFilter("assignee", ""),
    },
    siteVisitsOnly && {
      label: "Site visits",
      clear: () =>
        updateFilter("status", ""),
    },
    search && {
      label: `Search: ${search}`,
      clear: () =>
        updateFilter("q", ""),
    },
  ].filter(Boolean);

  const updatePage = (nextPage) => {
    updateParams({
      page: nextPage + 1,
    });
  };

  const updateRowsPerPage = (value) => {
    updateParams({
      limit: value,
      page: 1,
    });
  };

  return (
    <div className="properties-page">
      <header className="properties-topbar">
        <div className="properties-heading">
          <h1>
            {siteVisitsOnly
              ? "Site visits"
              : "Properties"}
          </h1>
          <span>
            {isFetching
              ? "Loading..."
              : `${total} listings`}
          </span>
        </div>

        <div className="properties-actions">
          <label className="search-box">
            <span className="sr-only">
              Search properties
            </span>

            <input
              value={search}
              onChange={(event) =>
                updateFilter(
                  "q",
                  event.target.value
                )
              }
              placeholder="Search properties"
            />
          </label>

          <button
            className="secondary-button"
            type="button"
            onClick={exportWorkbook}
            disabled={
              isExporting ||
              isLoading ||
              !total
            }
          >
            {isExporting
              ? "Exporting..."
              : "Export .xlsx"}
          </button>

          <div className="columns-control">
            <button
              className="secondary-button"
              type="button"
              aria-expanded={columnsOpen}
              onClick={() => setColumnsOpen((open) => !open)}
            >
              Columns
            </button>

            {columnsOpen && (
              <div className="columns-menu" role="group" aria-label="Visible columns">
                {PROPERTY_COLUMNS.map(({ key, label }) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(key)}
                      disabled={visibleColumns.length === 1 && visibleColumns.includes(key)}
                      onChange={() => setVisibleColumns((current) =>
                        current.includes(key)
                          ? current.filter((column) => column !== key)
                          : [...current, key]
                      )}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() =>
              navigate("/properties/new")
            }
          >
            + Add property
          </button>
        </div>
      </header>

      <div className="properties-body">
        <section
          className="properties-main"
          aria-label="Property listings"
        >
          <div className="filter-chips">
            {filters.map((filter) => (
              <button
                className="filter-chip"
                key={filter.label}
                type="button"
                onClick={filter.clear}
              >
                {filter.label}
                <span aria-hidden="true">
                  ×
                </span>
              </button>
            ))}

            {filters.length > 0 && (
              <button
                className="clear-filter"
                type="button"
                onClick={clearFilters}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="properties-query">
            {isFetching
              ? "Loading listings..."
              : `${total} matching listings`}
          </div>

          <div className="selection-bar">
            <strong>
              {selected.length} selected
            </strong>

            <button
              type="button"
              disabled={!selected.length}
              onClick={() =>
                startBulkAction("agent")
              }
            >
              Reassign
            </button>

            <button
              type="button"
              disabled={!selected.length}
              onClick={() =>
                startBulkAction("status")
              }
            >
              Change status
            </button>

            <button
              type="button"
              disabled={!selected.length}
              onClick={() =>
                startBulkAction("amenity")
              }
            >
              Add amenity
            </button>
          </div>

          {isError ? (
            <div className="empty-results">
              <p>
                Could not load properties.
              </p>

              <button
                className="primary-button"
                type="button"
                onClick={refetch}
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="property-table-wrapper">
              <table className="property-table">
                <thead>
                  <tr>
                    <th className="checkbox-column">
                      <input
                        type="checkbox"
                        aria-label="Select visible properties"
                        checked={
                          allVisibleSelected
                        }
                        onChange={
                          toggleVisible
                        }
                      />
                    </th>

                    {shownColumns.map(({ key, label }) => (
                      <th key={key}>
                        {key === "property" ? (
                          <button className="sort-button" type="button" onClick={toggleSort}>
                            PROPERTY {ascending ? "↑" : "↓"}
                          </button>
                        ) : label.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        className="empty-results"
                        colSpan={shownColumns.length + 1}
                      >
                        Loading properties...
                      </td>
                    </tr>
                  ) : (
                    properties.map(
                      (item) => (
                        <tr
                          key={item.id}
                          className={
                            selected.includes(
                              item.id
                            )
                              ? "selected-row"
                              : ""
                          }
                        >
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select ${getPropertyName(
                                item
                              )}`}
                              checked={selected.includes(
                                item.id
                              )}
                              onChange={() =>
                                toggleSelected(
                                  item.id
                                )
                              }
                            />
                          </td>

                          {shownColumns.map(({ key }) => {
                            if (key === "property") {
                              return (
                                <td key={key}>
                                  <button type="button" className="property-name property-name-link" onClick={() => openProperty(item.id)}>
                                    {getPropertyName(item)}
                                  </button>
                                  <div className="property-meta">
                                    {item.unitNo || item.unit || ""} · {getType(item)} · {getListingType(item)}
                                  </div>
                                </td>
                              );
                            }
                            if (key === "status") {
                              return (
                                <td key={key}>
                                  <span className={`status-badge status-${getStatus(item).toLowerCase().replaceAll(" ", "-")}`}>
                                    {getStatus(item)}
                                  </span>
                                </td>
                              );
                            }
                            const value = {
                              locality: getLocality(item),
                              bhk: getBhk(item) >= 4 ? `${getBhk(item)}+` : getBhk(item),
                              area: getArea(item).toLocaleString("en-IN"),
                              price: formatPrice(getPrice(item)),
                              agent: getAgent(item),
                              updated: getUpdated(item),
                            }[key];
                            return <td key={key} className={key === "price" ? "property-price" : undefined}>{value}</td>;
                          })}
                        </tr>
                      )
                    )
                  )}

                  {!isLoading &&
                    properties.length ===
                      0 && (
                      <tr>
                        <td
                          className="empty-results"
                          colSpan={shownColumns.length + 1}
                        >
                          No properties match these filters.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          )}

          <div className="pagination">
            <label>
              Rows per page{" "}
              <select
                value={rowsPerPage}
                onChange={(event) =>
                  updateRowsPerPage(
                    Number(
                      event.target.value
                    )
                  )
                }
              >
                <option value="10">
                  10
                </option>
                <option value="25">
                  25
                </option>
                <option value="50">
                  50
                </option>
                <option value="100">
                  100
                </option>
              </select>
            </label>

            <div className="pagination-right">
              <span>
                {total
                  ? `${page * rowsPerPage + 1}–${Math.min(
                      (page + 1) *
                        rowsPerPage,
                      total
                    )} of ${total}`
                  : "0 results"}
              </span>

              <button
                type="button"
                aria-label="Previous page"
                disabled={
                  page === 0 ||
                  isFetching
                }
                onClick={() =>
                  updatePage(
                    Math.max(
                      0,
                      page - 1
                    )
                  )
                }
              >
                ‹
              </button>

              <button
                type="button"
                aria-label="Next page"
                disabled={
                  page >=
                    pageCount - 1 ||
                  isFetching
                }
                onClick={() =>
                  updatePage(
                    Math.min(
                      pageCount - 1,
                      page + 1
                    )
                  )
                }
              >
                ›
              </button>
            </div>
          </div>

          {feedback && (
            <p
              className="properties-feedback"
              role="status"
            >
              {feedback}
            </p>
          )}
        </section>

        <aside
          className="property-filters"
          aria-label="Property filters"
        >
          <div className="filter-header">
            <strong>Filters</strong>

            <button
              type="button"
              onClick={clearFilters}
            >
              Reset
            </button>
          </div>

          <div className="filter-section">
            <label>LISTING</label>

            <div className="option-group">
              {["Sale", "Rent"].map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      listing === value
                        ? "option active"
                        : "option"
                    }
                    aria-pressed={
                      listing === value
                    }
                    onClick={() =>
                      updateFilter(
                        "listingType",
                        listing === value
                          ? ""
                          : value
                      )
                    }
                  >
                    {value}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="filter-section">
            <label>TYPE</label>

            <div className="option-group wrap">
              {[
                "Apartment",
                "Villa",
                "Plot",
                "Commercial",
              ].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    type === value
                      ? "option active"
                      : "option"
                  }
                  aria-pressed={
                    type === value
                  }
                  onClick={() =>
                    updateFilter(
                      "type",
                      type === value
                        ? ""
                        : value
                    )
                  }
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label>BHK</label>

            <div className="option-group">
              {[1, 2, 3, 4].map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      bhk.includes(value)
                        ? "option active"
                        : "option"
                    }
                    aria-pressed={bhk.includes(
                      value
                    )}
                    onClick={() =>
                      toggleBhk(value)
                    }
                  >
                    {value === 4
                      ? "4+"
                      : value}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="filter-section">
            <label>PRICE</label>

            <div className="price-control">
              <label htmlFor="minimum-price">
                Minimum
                <span>
                  {formatPrice(
                    minPrice
                  )}
                </span>
              </label>

              <input
                id="minimum-price"
                type="range"
                min="0"
                max={
                  maxPrice -
                  PRICE_STEP
                }
                step={PRICE_STEP}
                value={minPrice}
                onChange={(event) =>
                  updateFilter(
                    "minPrice",
                    Number(
                      event.target.value
                    )
                  )
                }
              />

              <label htmlFor="maximum-price">
                Maximum
                <span>
                  {formatPrice(
                    maxPrice
                  )}
                </span>
              </label>

              <input
                id="maximum-price"
                type="range"
                min={
                  minPrice +
                  PRICE_STEP
                }
                max={MAX_PRICE}
                step={PRICE_STEP}
                value={maxPrice}
                onChange={(event) =>
                  updateFilter(
                    "maxPrice",
                    Number(
                      event.target.value
                    )
                  )
                }
              />
            </div>
          </div>

          <div className="filter-section">
            <label htmlFor="filter-locality">
              LOCALITY
            </label>

            <select
              id="filter-locality"
              value={locality}
              onChange={(event) =>
                updateFilter(
                  "locality",
                  event.target.value ===
                    "Any locality"
                    ? ""
                    : event.target.value
                )
              }
            >
              <option>
                Any locality
              </option>

              {localities.map(
                (value) => (
                  <option
                    key={value}
                  >
                    {value}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="filter-section">
            <label htmlFor="filter-agent">
              AGENT
            </label>

            <select
              id="filter-agent"
              value={agent}
              onChange={(event) =>
                updateFilter("assignee", event.target.value)
              }
            >
              <option value="">All agents</option>

              {agents.map(
                ({ id, name }) => (
                  <option
                    key={id}
                    value={id}
                  >
                    {name}
                  </option>
                )
              )}
            </select>
          </div>
        </aside>
      </div>

      {dialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setDialog("");
            }
          }}
        >
          <section
            className="property-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-modal-title"
          >
            <div className="modal-heading">
              <h2 id="property-modal-title">
                {dialog === "agent"
                  ? "Reassign selected"
                  : dialog === "status"
                  ? "Change status"
                  : "Add amenity"}
              </h2>

              <button
                type="button"
                aria-label="Close dialog"
                onClick={() =>
                  setDialog("")
                }
              >
                ×
              </button>
            </div>

            <form
              className="property-form bulk-form"
              onSubmit={applyBulkAction}
            >
              {dialog === "agent" && (
                <label>
                  Assign agent

                  <select
                    value={bulkValue}
                    onChange={(event) =>
                      setBulkValue(
                        event.target.value
                      )
                    }
                  >
                    <option value="">Unassign</option>
                    {agents.map(
                      ({ id, name }) => (
                        <option
                          key={id}
                          value={id}
                        >
                          {name}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}

              {dialog === "status" && (
                <label>
                  New status

                  <select
                    value={bulkValue}
                    onChange={(event) =>
                      setBulkValue(
                        event.target.value
                      )
                    }
                  >
                    {statusOptions.map(
                      (value) => (
                        <option
                          key={value}
                        >
                          {value}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}

              {dialog === "amenity" && (
                <label>
                  Amenity

                  <input
                    required
                    value={bulkValue}
                    list="bulk-amenity-options"
                    onChange={(event) =>
                      setBulkValue(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Parking"
                  />
                  <datalist id="bulk-amenity-options">
                    {amenityOptions.map((amenity) => <option key={amenity} value={amenity} />)}
                  </datalist>
                </label>
              )}

              <p>
                This applies to{" "}
                {selected.length} selected{" "}
                {selected.length === 1
                  ? "property"
                  : "properties"}
                .
              </p>

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    setDialog("")
                  }
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={isBulkUpdating}
                >
                  {isBulkUpdating ? "Applying..." : "Apply"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Properties;