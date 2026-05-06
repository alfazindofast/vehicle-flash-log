"use client";

import { useState, useEffect } from "react";

interface FlashRecord {
  who: string;
  when: string;
  vehicle: string;
  oldSw: string;
  newSw: string;
}

interface FlashData {
  records: FlashRecord[];
  used: string[];
  vehicles: string[];
}

const OLD_SOFTWARE_VERSIONS = ["86.00", "86.01", "91.00", "91.02"];
const NEW_SOFTWARE_VERSIONS = ["86.02", "91.03"];

export default function Home() {
  const [records, setRecords] = useState<FlashRecord[]>([]);
  const [usedVehicles, setUsedVehicles] = useState<Set<string>>(new Set());
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [who, setWho] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [oldSw, setOldSw] = useState("");
  const [newSw, setNewSw] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter vehicles based on search input - search by vehicle number (part before dash)
  const filteredVehicles = vehicleSearch.trim()
    ? vehicles
      .filter((v) => {
        if (usedVehicles.has(v)) return false;
        const vehicleNumber = v.split(" - ")[0];
        const searchTerm = vehicleSearch.toLowerCase();
        const vehicleNumberLower = vehicleNumber.toLowerCase();
        
        // Only include if search term is a continuous substring
        const isMatch = vehicleNumberLower.includes(searchTerm);
        return isMatch;
      })
      .sort((a, b) => {
        const vehicleNumberA = a.split(" - ")[0].toLowerCase();
        const vehicleNumberB = b.split(" - ")[0].toLowerCase();
        const searchTerm = vehicleSearch.toLowerCase();
        
        // Prioritize suffix matches (ends with search term)
        const aEnds = vehicleNumberA.endsWith(searchTerm);
        const bEnds = vehicleNumberB.endsWith(searchTerm);
        if (aEnds && !bEnds) return -1;
        if (!aEnds && bEnds) return 1;
        
        return 0;
      })
      .slice(0, 50)  // Limit to first 50 results for performance with 10k vehicles
    : [];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/flash-log");
      if (res.ok) {
        const data: FlashData = await res.json();
        setRecords(data.records || []);
        setUsedVehicles(new Set(data.used || []));
        if (data.vehicles && data.vehicles.length > 0) {
          console.log("[v0] Loaded vehicles:", data.vehicles.length, "First few:", data.vehicles.slice(0, 5));
          setVehicles([...data.vehicles].sort());
        } else {
          console.log("[v0] No vehicles loaded from API");
        }
      }
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveData(newRecords: FlashRecord[], newUsed: Set<string>, newVehicles?: string[]) {
    try {
      await fetch("/api/flash-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: newRecords,
          used: [...newUsed],
          vehicles: newVehicles || vehicles,
        }),
      });
    } catch (e) {
      console.error("Failed to save:", e);
      alert("Warning: Failed to save to server. Please try again.");
    }
  }

  async function handleSubmit() {
    if (!who.trim() || !selectedVehicle || !oldSw || !newSw) {
      alert("Please fill in all fields before submitting.");
      return;
    }
    if (oldSw === newSw) {
      alert("Previous and new software versions cannot be the same.");
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const when = istTime.toISOString().slice(0, 19).replace("T", " ");

    const newRecord: FlashRecord = { who: who.trim(), when, vehicle: selectedVehicle, oldSw, newSw };
    const newRecords = [newRecord, ...records];
    const newUsed = new Set(usedVehicles);
    newUsed.add(selectedVehicle);

    setRecords(newRecords);
    setUsedVehicles(newUsed);

    await saveData(newRecords, newUsed);

    // Reset form
    setWho("");
    setSelectedVehicle("");
    setVehicleSearch("");
    setOldSw("");
    setNewSw("");
    setIsSubmitting(false);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }

  function exportCSV() {
    if (records.length === 0) {
      alert("No records to export.");
      return;
    }
    const rows = [["Technician", "Date & Time", "Vehicle Number", "Previous Software", "New Software"]];
    records.forEach((r) => rows.push([r.who, r.when, r.vehicle, r.oldSw, r.newSw]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `vehicle_flash_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const progressPercent = vehicles.length > 0 ? (usedVehicles.size / vehicles.length) * 100 : 0;

  // Get location from vehicle string (middle part: "P6DSVFMSPBA002839 - BLR - Zypp")
  const getLocation = (vehicle: string): string => {
    const parts = vehicle.split(" - ");
    return parts.length >= 2 ? parts[1] : "Unknown";
  };

  // Count flashed by location
  const flashedByLocation: Record<string, number> = {};
  records.forEach((r) => {
    const location = getLocation(r.vehicle);
    flashedByLocation[location] = (flashedByLocation[location] || 0) + 1;
  });

  // Display only last 10 records on site
  const displayRecords = records.slice(0, 10);

  if (isLoading) {
    return (
      <div className="page flex items-center justify-center min-h-screen">
        <p className="label">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <p className="header-label">Fleet Management</p>
        <h1>Vehicle Software Flash Log</h1>
        <p className="sub">Record software flash operations &mdash; one entry per vehicle</p>
      </header>

      {/* New Flash Record Card */}
      <div className="card">
        <p className="card-title">New flash record</p>

        {/* Technician Name */}
        <div className="field">
          <label>Technician name</label>
          <input
            type="text"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            placeholder="Enter your full name"
            autoComplete="name"
          />
        </div>

        {/* Vehicle Selection */}
        <div className="field" style={{ position: "relative" }}>
          <label>Vehicle number</label>
          <input
            type="text"
            value={vehicleSearch}
            onChange={(e) => {
              setVehicleSearch(e.target.value);
              setSelectedVehicle("");
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Type to search vehicle..."
          />
          {selectedVehicle && (
            <div className="selected-vehicle">
              Selected: <strong>{selectedVehicle}</strong>
            </div>
          )}
          {showSuggestions && filteredVehicles.length > 0 && (
            <ul className="suggestions">
              {filteredVehicles.map((v) => (
                <li
                  key={v}
                  onMouseDown={() => {
                    setSelectedVehicle(v);
                    setVehicleSearch(v);
                    setShowSuggestions(false);
                  }}
                >
                  {v}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Software Versions */}
        <div className="row-2">
          <div className="field">
            <label>Previous software</label>
            <select
              value={oldSw}
              onChange={(e) => setOldSw(e.target.value)}
            >
              <option value="" disabled>Select version</option>
              {OLD_SOFTWARE_VERSIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>New software</label>
            <select
              value={newSw}
              onChange={(e) => setNewSw(e.target.value)}
            >
              <option value="" disabled>Select version</option>
              {NEW_SOFTWARE_VERSIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button
          className="btn"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit flash record"}
        </button>

        {/* Success Message */}
        <div className={`success-msg ${showSuccess ? "show" : ""}`}>
          &#10003; Flash record saved successfully
        </div>
      </div>

      {/* Log Section */}
      <div className="log-section">
        <div className="log-header">
          <div className="progress-wrap">
            <span className="progress-label">
              {usedVehicles.size} / {vehicles.length} flashed
            </span>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <button className="export-btn" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        {records.length === 0 ? (
          <div className="empty-state">No records submitted yet</div>
        ) : (
          <>
            <div className="location-stats">
              {Object.entries(flashedByLocation)
                .sort((a, b) => b[1] - a[1])
                .map(([location, count]) => (
                  <div key={location} className="location-stat">
                    <span className="location-name">{location}</span>
                    <span className="location-count">{count}</span>
                  </div>
                ))}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Date &amp; Time</th>
                    <th>Vehicle</th>
                    <th>Software</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRecords.map((r, i) => (
                    <tr key={i}>
                      <td>{r.who}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{r.when}</td>
                      <td className="vehicle-cell">{r.vehicle}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className="sw-badge">{r.oldSw}</span>
                        <span className="arrow">&#8594;</span>
                        <span className="sw-badge">{r.newSw}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {records.length > 10 && (
              <div className="records-note">
                Showing latest 10 of {records.length} total records
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
