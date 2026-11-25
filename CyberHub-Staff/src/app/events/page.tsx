"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { eventCertificateUrl, eventDateFormat, eventsUrl, type EventMode, type FacultyEvent } from "@/lib/facultyEvents";
import EventDetailsDialog from "./EventDetailsDialog";
import styles from "./events.module.css";

const DATE_FILTERS = ["Last 6 Months", "Last 3 Months", "This Year", "All Time"];
const PER_PAGE = 3;

/* ── SVG Icon helpers ── */
const IcoSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcoCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoFilter = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);
const IcoChevronLeft  = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IcoChevronRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcoChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* ── Status Badge ── */
export default function EventsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]     = useState<EventMode>("attended");
  const [search, setSearch]           = useState("");
  const [dateFilter, setDateFilter]   = useState("All Time");
  const [catFilter, setCatFilter]     = useState("All");
  const [page, setPage]               = useState(1);
  const [showDateDrop, setShowDateDrop] = useState(false);
  const [showCatDrop, setShowCatDrop]   = useState(false);

  const [events, setEvents] = useState<FacultyEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<FacultyEvent | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(eventsUrl, {
      credentials: "include", cache: "no-store", signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error();
      const payload = await response.json() as { data: FacultyEvent[] };
      setEvents(payload.data);
      setLoadState("ready");
    }).catch(() => {
      if (!controller.signal.aborted) setLoadState("error");
    });
    return () => controller.abort();
  }, []);

  const categories = ["All", ...new Set(events.map((event) => event.category))];
  const filtered = useMemo(() => {
    const now = new Date();
    const cutoff = dateFilter === "This Year" ? new Date(Date.UTC(now.getUTCFullYear(), 0, 1)) : new Date(now);
    if (dateFilter === "Last 3 Months") cutoff.setUTCMonth(cutoff.getUTCMonth() - 3);
    if (dateFilter === "Last 6 Months") cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
    return events.filter((event) => (
      event.mode === activeTab
      && event.name.toLowerCase().includes(search.trim().toLowerCase())
      && (catFilter === "All" || event.category === catFilter)
      && (dateFilter === "All Time" || new Date(event.eventDate) >= cutoff)
    ));
  }, [events, activeTab, search, catFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleTabChange = (tab: EventMode) => { setActiveTab(tab); setPage(1); };
  const handleSearch    = (val: string)   => { setSearch(val);    setPage(1); };
  const handleCat       = (cat: string)   => { setCatFilter(cat); setPage(1); setShowCatDrop(false); };
  const handleDate      = (d: string)     => { setDateFilter(d);  setPage(1); setShowDateDrop(false); };

  return (
    <MainLayout
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "My Events" }]}
      userName="Sunil P"
    >
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Event Management</h1>
          <p className={styles.pageSubtitle}>Track, manage, and review your academic participation and contributions.</p>
        </div>
        <button id="log-new-event-btn" className={styles.logBtn} onClick={() => router.push("/add-event")}>
          <IcoPlus /> Log New Event
        </button>
      </div>

      {/* Main card */}
      <div className={styles.card}>
        {/* Tabs */}
        <div className={styles.tabs} role="tablist">
          <button
            id="tab-attended"
            role="tab"
            aria-selected={activeTab === "attended"}
            className={`${styles.tab} ${activeTab === "attended" ? styles.activeTab : ""}`}
            onClick={() => handleTabChange("attended")}
          >
            Attended Events
          </button>
          <button
            id="tab-conducted"
            role="tab"
            aria-selected={activeTab === "conducted"}
            className={`${styles.tab} ${activeTab === "conducted" ? styles.activeTab : ""}`}
            onClick={() => handleTabChange("conducted")}
          >
            Conducted Events
          </button>
        </div>

        {/* Filters */}
        <div className={styles.filtersBar}>
          {/* Search */}
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}><IcoSearch /></span>
            <input
              id="events-search"
              type="text"
              className={styles.searchInput}
              placeholder="Search events by name…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            {/* Date filter */}
            <div style={{ position: "relative" }}>
              <button id="date-filter-btn" className={styles.filterBtn} onClick={() => { setShowDateDrop(!showDateDrop); setShowCatDrop(false); }}>
                <IcoCalendar /> {dateFilter} <IcoChevronDown />
              </button>
              {showDateDrop && (
                <div style={{ position:"absolute", top:"100%", left:0, marginTop:4, background:"#fff", border:"1.5px solid var(--border)", borderRadius:10, boxShadow:"var(--shadow-md)", zIndex:100, minWidth:150, overflow:"hidden" }}>
                  {DATE_FILTERS.map((d) => (
                    <button key={d} onClick={() => handleDate(d)}
                      style={{ display:"block", width:"100%", textAlign:"left", padding:"0.55rem 0.9rem", background: d === dateFilter ? "#eef2ff":"transparent", color: d === dateFilter ? "var(--accent)":"var(--text-primary)", border:"none", fontSize:"0.82rem", fontWeight: d===dateFilter ? 600:400, cursor:"pointer", fontFamily:"inherit" }}>
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category filter */}
            <div style={{ position: "relative" }}>
              <button id="category-filter-btn" className={styles.filterBtn} onClick={() => { setShowCatDrop(!showCatDrop); setShowDateDrop(false); }}>
                <IcoFilter /> Category: {catFilter} <IcoChevronDown />
              </button>
              {showCatDrop && (
                <div style={{ position:"absolute", top:"100%", right:0, marginTop:4, background:"#fff", border:"1.5px solid var(--border)", borderRadius:10, boxShadow:"var(--shadow-md)", zIndex:100, minWidth:130, overflow:"hidden" }}>
                  {categories.map((c) => (
                    <button key={c} onClick={() => handleCat(c)}
                      style={{ display:"block", width:"100%", textAlign:"left", padding:"0.55rem 0.9rem", background: c === catFilter ? "#eef2ff":"transparent", color: c === catFilter ? "var(--accent)":"var(--text-primary)", border:"none", fontSize:"0.82rem", fontWeight: c===catFilter ? 600:400, cursor:"pointer", fontFamily:"inherit" }}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper}>
          {paginated.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
              <div className={styles.emptyTitle}>{loadState === "loading" ? "Loading events..." : loadState === "error" ? "Events could not be loaded." : "No events found"}</div>
              <div className={styles.emptyDesc}>Try adjusting your search or filters.</div>
            </div>
          ) : (
            <table className={styles.eventsTable} aria-label="Events table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event Name</th>
                  <th>Category</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((ev) => (
                  <tr key={ev.id}>
                    <td className={styles.dateCell}>{eventDateFormat.format(new Date(ev.eventDate))}</td>
                    <td>
                      <button type="button" className={styles.eventName} aria-haspopup="dialog" onClick={() => setSelectedEvent(ev)}>
                        {ev.name}
                      </button>
                      {ev.certificate && <a className={styles.certificateDownload}
                        href={eventCertificateUrl(ev.id)}
                        aria-label={`Download certificate for ${ev.name}`} title={ev.certificate.fileName}>Download certificate</a>}
                    </td>
                    <td><span className={styles.categoryBadge}>{ev.category}</span></td>
                    <td><span className={styles.roleBadge}>{ev.facultyRole}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className={styles.pagination}>
            <span className={styles.paginInfo}>
              Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} events
            </span>
            <div className={styles.paginBtns}>
              <button id="prev-page-btn" className={styles.pageBtn} onClick={() => setPage((p) => p - 1)} disabled={page === 1} aria-label="Previous page">
                <IcoChevronLeft />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  id={`page-btn-${p}`}
                  className={`${styles.pageBtn} ${p === page ? styles.activePage : ""}`}
                  onClick={() => setPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </button>
              ))}
              <button id="next-page-btn" className={styles.pageBtn} onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} aria-label="Next page">
                <IcoChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Close dropdowns on outside click */}
      {(showDateDrop || showCatDrop) && (
        <div style={{ position:"fixed", inset:0, zIndex:99 }} onClick={() => { setShowDateDrop(false); setShowCatDrop(false); }} />
      )}
      {selectedEvent && <EventDetailsDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </MainLayout>
  );
}
