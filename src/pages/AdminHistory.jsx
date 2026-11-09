import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Clock3,
  ClipboardList,
  FileText,
  Filter,
  HeartPulse,
  Mail,
  MapPin,
  Pill,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";

import DashboardSidebar from "../components/DashboardSidebar";
import ProfileMenu from "../components/ProfileMenu";
import ThemeToggle from "../components/ThemeToggle";

import "./AdminHistory.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

function getTokenLabel(token) {
  return `A-${String(token ?? 0).padStart(3, "0")}`;
}

function getConsultationDate(record) {
  return record?.consultationAt || record?.completedAt || null;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getDateValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function displayValue(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "Not available";
  }

  return value;
}

function AdminHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("newest");

  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchConsultations = useCallback(async () => {
    const authToken = sessionStorage.getItem("carequeue-auth-token");

    if (!authToken) {
      setError("Admin login session not found. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/consultations`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: "application/json",
          },
        }
      );

      const responseData = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          response.status === 401
            ? "Your admin session has expired. Please log in again."
            : "You are not authorized to view consultation records."
        );
      }

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            `Unable to load consultation records (${response.status}).`
        );
      }

      if (!Array.isArray(responseData)) {
        throw new Error("Invalid consultation data received from server.");
      }

      setRecords(responseData);

      setSelectedRecord((previous) => {
        if (!previous) return null;

        return (
          responseData.find(
            (record) => record.id === previous.id
          ) || null
        );
      });
    } catch (fetchError) {
      console.error("Admin consultation history error:", fetchError);

      setError(
        fetchError.message ||
          "Unable to connect to the consultation server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsultations();

    const handleFocus = () => {
      fetchConsultations();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchConsultations]);

  const filteredRecords = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    const filtered = records.filter((record) => {
      const patientName = (
        record.patientDetails?.name ||
        record.patientName ||
        ""
      ).toLowerCase();

      const patientEmail = (
        record.patientDetails?.email ||
        record.patientEmail ||
        ""
      ).toLowerCase();

      const token = getTokenLabel(record.token).toLowerCase();

      const matchesSearch =
        !searchText ||
        token.includes(searchText) ||
        String(record.token ?? "").includes(searchText) ||
        patientName.includes(searchText) ||
        patientEmail.includes(searchText);

      const consultationDate = getDateValue(
        getConsultationDate(record)
      );

      const matchesFromDate =
        !fromDate || consultationDate >= fromDate;

      const matchesToDate =
        !toDate || consultationDate <= toDate;

      return (
        matchesSearch &&
        matchesFromDate &&
        matchesToDate
      );
    });

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "token") {
        comparison =
          Number(a.token || 0) - Number(b.token || 0);
      } else {
        const dateA = new Date(
          getConsultationDate(a) || 0
        ).getTime();

        const dateB = new Date(
          getConsultationDate(b) || 0
        ).getTime();

        comparison = dateA - dateB;
      }

      return sortOrder === "newest"
        ? -comparison
        : comparison;
    });

    return filtered;
  }, [records, search, fromDate, toDate, sortBy, sortOrder]);

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setSortBy("date");
    setSortOrder("newest");
  };

  const patientDetails = selectedRecord?.patientDetails || {};

  return (
    <div className="admin-history-page">
      {/* HEADER */}
      <header className="admin-history-header">
        <div className="admin-history-header-left">
          <DashboardSidebar role="Admin" />

          <div className="admin-history-brand">
            <div className="admin-history-logo">
              <HeartPulse size={24} />
            </div>

            <div>
              <h2>CareQueue</h2>
              <p>Admin Control Panel</p>
            </div>
          </div>
        </div>

        <div className="admin-history-header-right">
          <ThemeToggle />

          <ProfileMenu
            role="Admin"
            name="Administrator"
          />
        </div>
      </header>

      <main className="admin-history-container">
        {/* PAGE HEADING */}
        <section className="admin-history-heading">
          <div>
            <span className="admin-history-label">
              ADMINISTRATION
            </span>

            <h1>Work History</h1>

            <p>
              View and manage completed patient consultations.
            </p>
          </div>

          <div className="admin-history-heading-icon">
            <ClipboardList size={34} />
          </div>
        </section>

        {/* SUMMARY */}
        <section className="admin-history-summary">
          <div className="admin-history-summary-card">
            <div className="admin-history-summary-icon">
              <Activity size={22} />
            </div>

            <div>
              <span>TOTAL CONSULTATIONS</span>
              <strong>{records.length}</strong>
              <small>All recorded consultations</small>
            </div>
          </div>

          <div className="admin-history-summary-card">
            <div className="admin-history-summary-icon secondary">
              <Filter size={22} />
            </div>

            <div>
              <span>FILTERED RESULTS</span>
              <strong>{filteredRecords.length}</strong>
              <small>Matching your current filters</small>
            </div>
          </div>
        </section>

        {/* CONSULTATION RECORDS */}
        <section className="admin-history-content">
          <div className="admin-history-section-heading">
            <div>
              <div className="admin-history-title-with-icon">
                <div className="admin-history-small-icon">
                  <ClipboardList size={19} />
                </div>

                <h2>Consultation Records</h2>
              </div>

              <p>
                Search and view previously completed consultations.
              </p>
            </div>

            <button
              type="button"
              className="admin-history-refresh-btn"
              onClick={fetchConsultations}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "admin-history-spinning" : ""}
              />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* FILTERS */}
          <div className="admin-history-filters">
            <div className="admin-history-search">
              <label>
                <Search size={14} />
                Search records
              </label>

              <div className="admin-history-input-wrap">
                <Search size={17} />

                <input
                  type="text"
                  placeholder="Token, patient name or email..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="admin-history-filter-field">
              <label>From Date</label>

              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) =>
                  setFromDate(event.target.value)
                }
              />
            </div>

            <div className="admin-history-filter-field">
              <label>To Date</label>

              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) =>
                  setToDate(event.target.value)
                }
              />
            </div>

            <div className="admin-history-filter-field">
              <label>Sort By</label>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value)
                }
              >
                <option value="date">Date & Time</option>
                <option value="token">Token Number</option>
              </select>
            </div>

            <div className="admin-history-filter-field">
              <label>Order</label>

              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value)
                }
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            <button
              type="button"
              className="admin-history-clear-btn"
              onClick={clearFilters}
            >
              <X size={15} />
              Clear
            </button>
          </div>

          {/* LOADING / ERROR */}
          {loading && records.length === 0 ? (
            <div className="admin-history-state">
              <div className="admin-history-loading-icon">
                <RefreshCw size={25} />
              </div>
              <h3>Loading consultation records</h3>
              <p>Fetching records from the database...</p>
            </div>
          ) : error ? (
            <div className="admin-history-state admin-history-error">
              <div className="admin-history-loading-icon">
                <Activity size={25} />
              </div>

              <h3>Unable to load records</h3>
              <p>{error}</p>

              <button
                type="button"
                className="admin-history-view-btn"
                onClick={fetchConsultations}
              >
                <RefreshCw size={15} />
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* TABLE */}
              <div className="admin-history-table-wrapper">
                <table className="admin-history-table">
                  <thead>
                    <tr>
                      <th>Consulted Token</th>
                      <th>Patient Name</th>
                      <th>Time</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="admin-history-empty"
                        >
                          <ClipboardList size={30} />
                          <strong>
                            {records.length === 0
                              ? "No consultation records yet"
                              : "No matching records found"}
                          </strong>
                          <span>
                            {records.length === 0
                              ? "Completed consultations will appear here."
                              : "Try changing your search or date filters."}
                          </span>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => (
                        <tr key={record.id}>
                          <td>
                            <span className="admin-history-token">
                              {getTokenLabel(record.token)}
                            </span>
                          </td>

                          <td>
                            <div className="admin-history-patient-cell">
                              <div className="admin-history-patient-avatar">
                                <UserRound size={17} />
                              </div>

                              <span>
                                {record.patientDetails?.name ||
                                  record.patientName ||
                                  "Walk-in Patient"}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="admin-history-date-cell">
                              <Clock3 size={14} />
                              {formatTime(
                                getConsultationDate(record)
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="admin-history-date-cell">
                              <CalendarDays size={14} />
                              {formatDate(
                                getConsultationDate(record)
                              )}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="admin-history-view-btn"
                              onClick={() =>
                                setSelectedRecord(record)
                              }
                            >
                              <FileText size={15} />
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="admin-history-results">
                Showing <strong>{filteredRecords.length}</strong> of{" "}
                <strong>{records.length}</strong> records
              </div>
            </>
          )}
        </section>
      </main>

      {/* CONSULTATION DETAILS MODAL */}
      {selectedRecord && (
        <div
          className="admin-history-modal-overlay"
          onClick={() => setSelectedRecord(null)}
        >
          <section
            className="admin-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-history-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="admin-history-modal-header">
              <div>
                <span className="admin-history-label">
                  COMPLETE PATIENT RECORD
                </span>

                <h2 id="admin-history-modal-title">
                  {getTokenLabel(selectedRecord.token)}
                </h2>

                <p>
                  {displayValue(
                    patientDetails.name || selectedRecord.patientName
                  )}
                </p>
              </div>

              <button
                type="button"
                className="admin-history-close-btn"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="admin-history-modal-body">
              {/* PATIENT INFORMATION */}
              <div className="admin-history-detail-section">
                <div className="admin-history-detail-heading">
                  <UserRound size={19} />
                  <h3>Patient Personal Information</h3>
                </div>

                <div className="admin-history-profile-preview">
                  {patientDetails.profilePhotoData ? (
                    <img
                      src={patientDetails.profilePhotoData}
                      alt={patientDetails.name || "Patient"}
                    />
                  ) : (
                    <div className="admin-history-profile-placeholder">
                      <UserRound size={34} />
                    </div>
                  )}

                  <div>
                    <strong>
                      {displayValue(patientDetails.name)}
                    </strong>
                    <span>Registered Patient</span>
                  </div>
                </div>

                <div className="admin-history-detail-grid">
                  <div>
                    <span>Patient ID</span>
                    <strong>{displayValue(patientDetails.id)}</strong>
                  </div>

                  <div>
                    <span>Full Name</span>
                    <strong>{displayValue(patientDetails.name)}</strong>
                  </div>

                  <div>
                    <span>Email Address</span>
                    <strong>{displayValue(patientDetails.email)}</strong>
                  </div>

                  <div>
                    <span>Mobile Number</span>
                    <strong>{displayValue(patientDetails.phone)}</strong>
                  </div>

                  <div>
                    <span>Age</span>
                    <strong>{displayValue(patientDetails.age)}</strong>
                  </div>

                  <div>
                    <span>Gender</span>
                    <strong>{displayValue(patientDetails.gender)}</strong>
                  </div>

                  <div className="admin-history-full-width">
                    <span>Residential Address</span>
                    <strong>{displayValue(patientDetails.address)}</strong>
                  </div>
                </div>
              </div>

              {/* CONSULTATION INFORMATION */}
              <div className="admin-history-detail-section">
                <div className="admin-history-detail-heading">
                  <Stethoscope size={19} />
                  <h3>Consultation Information</h3>
                </div>

                <div className="admin-history-detail-grid">
                  <div>
                    <span>Token Number</span>
                    <strong>
                      {getTokenLabel(selectedRecord.token)}
                    </strong>
                  </div>

                  <div>
                    <span>Queue Session</span>
                    <strong>
                      {displayValue(selectedRecord.queueSessionId)}
                    </strong>
                  </div>

                  <div>
                    <span>Department</span>
                    <strong>
                      {displayValue(selectedRecord.department)}
                    </strong>
                  </div>

                  <div>
                    <span>Doctor</span>
                    <strong>
                      {displayValue(selectedRecord.doctor)}
                    </strong>
                  </div>

                  <div>
                    <span>Consultation Date</span>
                    <strong>
                      {formatDate(getConsultationDate(selectedRecord))}
                    </strong>
                  </div>

                  <div>
                    <span>Consultation Time</span>
                    <strong>
                      {formatTime(getConsultationDate(selectedRecord))}
                    </strong>
                  </div>

                  <div>
                    <span>Completion Date</span>
                    <strong>
                      {formatDate(selectedRecord.completedAt)}
                    </strong>
                  </div>

                  <div>
                    <span>Completion Time</span>
                    <strong>
                      {formatTime(selectedRecord.completedAt)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* REASON */}
              <div className="admin-history-detail-section">
                <div className="admin-history-detail-heading">
                  <FileText size={19} />
                  <h3>Reason for Visit</h3>
                </div>

                <p>{displayValue(selectedRecord.reason)}</p>
              </div>

              {/* DIAGNOSIS */}
              <div className="admin-history-detail-section">
                <div className="admin-history-detail-heading">
                  <Activity size={19} />
                  <h3>Diagnosis</h3>
                </div>

                <p>{displayValue(selectedRecord.diagnosis)}</p>
              </div>

              {/* NOTES */}
              <div className="admin-history-detail-section">
                <div className="admin-history-detail-heading">
                  <ClipboardList size={19} />
                  <h3>Doctor's Notes</h3>
                </div>

                <p>{displayValue(selectedRecord.notes)}</p>
              </div>

              {/* PRESCRIPTION */}
              <div className="admin-history-detail-section">
                <div className="admin-history-detail-heading">
                  <Pill size={19} />
                  <h3>Prescription</h3>
                </div>

                {!selectedRecord.medicines?.length ? (
                  <p>No medicines prescribed.</p>
                ) : (
                  <div className="admin-history-medicine-list">
                    {selectedRecord.medicines.map(
                      (medicine, index) => (
                        <div
                          className="admin-history-medicine"
                          key={`${selectedRecord.id}-${index}`}
                        >
                          <strong>
                            {index + 1}. {medicine.name}
                          </strong>

                          <div className="admin-history-medicine-details">
                            <span>
                              <b>Dosage:</b>{" "}
                              {displayValue(medicine.dosage)}
                            </span>

                            <span>
                              <b>Frequency:</b>{" "}
                              {displayValue(medicine.frequency)}
                            </span>

                            <span>
                              <b>Duration:</b>{" "}
                              {displayValue(medicine.duration)}
                            </span>

                            <span>
                              <b>Instructions:</b>{" "}
                              {displayValue(medicine.instructions)}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="admin-history-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
              >
                Close Details
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminHistory;