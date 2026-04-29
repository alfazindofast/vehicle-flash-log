"use client";

import { useState, useEffect, useMemo } from "react";

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
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [oldSw, setOldSw] = useState("");
  const [newSw, setNewSw] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin state
  const [bulkVehicles, setBulkVehicles] = useState("");

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

  const filteredVehicles = useMemo(() => {
    const searchTerm = vehicleSearch.toLowerCase();
    return vehicles.filter((v) => v.toLowerCase().includes(searchTerm));
  }, [vehicles, vehicleSearch]);

  function selectVehicle(v: string) {
    setSelectedVehicle(v);
    setVehicleSearch(v);
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
    setVehicleSearch("");
    setOldSw("");
    setNewSw("");
    setIsSubmitting(false);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }

  async function handleUpdateVehicles() {
    const newVehicles = bulkVehicles
      .split("\n")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (newVehicles.length === 0) {
      alert("Please enter at least one vehicle number.");
      return;
    }

    if (!confirm(`This will replace the current list with ${newVehicles.length} vehicles. Continue?`)) {
      return;
    }

    const uniqueVehicles = [...new Set(newVehicles)].sort();
    setVehicles(uniqueVehicles);
    await saveData(records, usedVehicles, uniqueVehicles);
    setBulkVehicles("");
    alert("Vehicle list updated successfully!");
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
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="font-mono text-sm text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-8 pb-16">
      <div className="max-w-[620px] mx-auto">
        {/* Header */}
        <header className="mb-10 pb-6 border-b border-[var(--border)]">
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-[var(--muted-foreground)] mb-2">
            Fleet Management
          </p>
          <h1 className="text-[26px] font-serif font-normal text-[var(--foreground)] leading-tight mb-1.5">
            Vehicle Software Flash Log
          </h1>
          <p className="font-mono text-sm text-[var(--muted-foreground)]">
            Record software flash operations &mdash; one entry per vehicle
          </p>
        </header>

        {/* New Flash Record Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-7 mb-6">
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--muted-foreground)] mb-5">
            New flash record
          </p>

          {/* Technician Name */}
          <div className="mb-5">
            <label className="block font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--muted-foreground)] mb-1.5">
              Technician name
            </label>
            <input
              type="text"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="Enter your full name"
              className="w-full h-[42px] px-3.5 border border-[var(--border-strong)] rounded-lg bg-[var(--card)] text-[var(--foreground)] font-mono text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--ring)]"
            />
          </div>

          {/* Vehicle Selection */}
          <div className="mb-5">
            <label className="block font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--muted-foreground)] mb-1.5">
              Vehicle number
            </label>
            <input
              type="text"
              value={vehicleSearch}
              onChange={(e) => {
                setVehicleSearch(e.target.value);
                setSelectedVehicle("");
              }}
              placeholder="Search or scroll to select..."
              className="w-full h-[42px] px-3.5 border border-[var(--border-strong)] rounded-lg bg-[var(--card)] text-[var(--foreground)] font-mono text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--ring)] mb-2"
            />
            <div className="max-h-60 overflow-y-auto border border-[var(--border-strong)] rounded-lg bg-[var(--card)]">
              {filteredVehicles.length === 0 ? (
                <div className="p-4 text-center font-mono text-sm text-[var(--muted-foreground)]">
                  No vehicles found
                </div>
              ) : (
                filteredVehicles.map((v) => {
                  const isUsed = usedVehicles.has(v);
                  const isSelected = selectedVehicle === v;
                  return (
                    <div
                      key={v}
                      onClick={() => !isUsed && selectVehicle(v)}
                      className={`px-3.5 py-2.5 font-mono text-[13px] border-b border-[var(--border)] last:border-b-0 transition-colors ${
                        isSelected
                          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                          : isUsed
                          ? "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
                          : "hover:bg-[var(--muted)] cursor-pointer"
                      }`}
                    >
                      {v}
                      {isUsed && (
                        <span className="text-[10px] text-[var(--success-foreground)] ml-2">
                          &#10003; done
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Software Versions */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--muted-foreground)] mb-1.5">
                Previous software
              </label>
              <select
                value={oldSw}
                onChange={(e) => setOldSw(e.target.value)}
                className="w-full h-[42px] px-3.5 pr-9 border border-[var(--border-strong)] rounded-lg bg-[var(--card)] text-[var(--foreground)] font-mono text-sm appearance-none focus:outline-none focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--ring)]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b6a63' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                }}
              >
                <option value="" disabled>Select version</option>
                {SOFTWARE_VERSIONS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--muted-foreground)] mb-1.5">
                New software
              </label>
              <select
                value={newSw}
                onChange={(e) => setNewSw(e.target.value)}
                className="w-full h-[42px] px-3.5 pr-9 border border-[var(--border-strong)] rounded-lg bg-[var(--card)] text-[var(--foreground)] font-mono text-sm appearance-none focus:outline-none focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--ring)]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b6a63' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                }}
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
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-11 bg-[var(--accent)] text-[var(--accent-foreground)] border-none rounded-lg font-mono text-[13px] tracking-[0.06em] uppercase cursor-pointer transition-opacity hover:opacity-85 active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed mt-1"
          >
            {isSubmitting ? "Submitting..." : "Submit flash record"}
          </button>

          {/* Success Message */}
          {showSuccess && (
            <div className="mt-3 bg-[var(--success)] border border-[var(--success-border)] text-[var(--success-foreground)] rounded-lg py-3 px-4 font-mono text-[13px] text-center">
              &#10003; Flash record saved successfully
            </div>
          )}
        </div>

        {/* Log Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-[var(--muted-foreground)]">
                {usedVehicles.size} / {vehicles.length} flashed
              </span>
              <div className="w-[120px] h-1 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-[width] duration-400"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <button
              onClick={exportCSV}
              className="font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--muted-foreground)] bg-transparent border border-[var(--border-strong)] rounded-lg px-3.5 py-1.5 cursor-pointer transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Export CSV
            </button>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-10 px-4 font-mono text-[13px] text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-xl">
              No records submitted yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs">
                <thead>
                  <tr>
                    <th className="text-left font-normal text-[var(--muted-foreground)] tracking-[0.08em] uppercase py-2 px-2.5 border-b border-[var(--border)] whitespace-nowrap">
                      Technician
                    </th>
                    <th className="text-left font-normal text-[var(--muted-foreground)] tracking-[0.08em] uppercase py-2 px-2.5 border-b border-[var(--border)] whitespace-nowrap">
                      Date &amp; Time
                    </th>
                    <th className="text-left font-normal text-[var(--muted-foreground)] tracking-[0.08em] uppercase py-2 px-2.5 border-b border-[var(--border)] whitespace-nowrap">
                      Vehicle
                    </th>
                    <th className="text-left font-normal text-[var(--muted-foreground)] tracking-[0.08em] uppercase py-2 px-2.5 border-b border-[var(--border)] whitespace-nowrap">
                      Software
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-[var(--muted)]">
                      <td className="py-2.5 px-2.5 border-b border-[var(--border)] align-top">
                        {r.who}
                      </td>
                      <td className="py-2.5 px-2.5 border-b border-[var(--border)] align-top whitespace-nowrap">
                        {r.when}
                      </td>
                      <td className="py-2.5 px-2.5 border-b border-[var(--border)] align-top text-[11px] break-all">
                        {r.vehicle}
                      </td>
                      <td className="py-2.5 px-2.5 border-b border-[var(--border)] align-top whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] text-[11px]">
                          {r.oldSw}
                        </span>
                        <span className="text-[var(--muted-foreground)] mx-1">&#8594;</span>
                        <span className="inline-block px-2 py-0.5 rounded bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] text-[11px]">
                          {r.newSw}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Admin Section */}
        <div className="mt-8 bg-[var(--card)] border border-[var(--border-strong)] rounded-xl p-7">
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--muted-foreground)] mb-5">
            Admin: Manage vehicle list
          </p>
          <div className="mb-5">
            <label className="block font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--muted-foreground)] mb-1.5">
              Paste vehicle numbers (one per line)
            </label>
            <textarea
              value={bulkVehicles}
              onChange={(e) => setBulkVehicles(e.target.value)}
              rows={8}
              className="w-full p-3 border border-[var(--border-strong)] rounded-lg font-mono text-xs resize-y focus:outline-none focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--ring)]"
            />
          </div>
          <button
            onClick={handleUpdateVehicles}
            className="w-full h-11 bg-[var(--accent)] text-[var(--accent-foreground)] border-none rounded-lg font-mono text-[13px] tracking-[0.06em] uppercase cursor-pointer transition-opacity hover:opacity-85 active:scale-[0.99]"
          >
            Update vehicle list
          </button>
        </div>
      </div>
    </div>
  );
}
