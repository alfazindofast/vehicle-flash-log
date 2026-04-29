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

const DEFAULT_VEHICLES = [
  "P6EBE1ATD24000002", "P6EBE1FYH24000153", "P6EBE1FYH24000166",
  "P6EBE1FYH24000179", "P6EBE1FYH24000190", "P6EBE1FYH24000158",
  "P6EBE1FYH24000191", "P6EBE1FYH24000159", "P6EBE1FYH24000198",
  "P6EBE1FYH24000183", "P6EBE1FYH24000160", "P6EBE1FYH24000169",
  "P6EBE1FYH24000194", "P6EBE1FYH24000195", "P6EBE1FYH24000167",
  "P6EBE1FYH24000161", "P6EBE1FYH24000177", "P6EBE1FYH24000156",
  "P6EBE1FYH24000186", "P6EBE1FYH24000189"
];

const SOFTWARE_VERSIONS = ["86.00", "86.01", "86.02"];

export default function Home() {
  const [records, setRecords] = useState<FlashRecord[]>([]);
  const [usedVehicles, setUsedVehicles] = useState<Set<string>>(new Set());
  const [vehicles, setVehicles] = useState<string[]>(DEFAULT_VEHICLES);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [who, setWho] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [oldSw, setOldSw] = useState("");
  const [newSw, setNewSw] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          setVehicles([...data.vehicles].sort());
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
    const when = now.toISOString().slice(0, 19).replace("T", " ");

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
        <div className="field">
          <label>Vehicle number</label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
          >
            <option value="" disabled>Select a vehicle</option>
            {vehicles.map((v) => {
              const isUsed = usedVehicles.has(v);
              return (
                <option key={v} value={v} disabled={isUsed}>
                  {v}{isUsed ? "  [done]" : ""}
                </option>
              );
            })}
          </select>
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
              {SOFTWARE_VERSIONS.map((v) => (
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
              {SOFTWARE_VERSIONS.map((v) => (
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
                {records.map((r, i) => (
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
        )}
      </div>
    </div>
  );
}
