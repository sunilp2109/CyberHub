"use client";

import type { ReactNode } from "react";
import { Icon } from "./AdminShell";
import s from "./admin.module.css";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <header className={s.pageHeader}><div><h1>{title}</h1><p>{description}</p></div>{actions}</header>;
}

export function DemoNote({ children = "Demo workspace. Academic changes are saved in this browser for this admin account." }: { children?: ReactNode }) {
  return <p className={s.demoNote}><Icon name="info" size={16} />{children}</p>;
}

export function Status({ value }: { value: string }) {
  const tone = /^(active|approved|enabled|completed)$/i.test(value) ? "good" : /^(rejected|revoked|disabled)$/i.test(value)
    ? "bad" : /^(pending|submitted|scheduled|upcoming)$/i.test(value) ? "pending" : "neutral";
  return <span className={s.badge} data-tone={tone}>{value}</span>;
}

export function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className={s.empty}><span><Icon name="file" size={22} /></span><strong>{title}</strong><p>{detail}</p></div>;
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((value) => {
    const text = String(value);
    const safe = typeof value === "string" && /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  }).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name + ".csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDate(value: string) {
  const date = new Date(value);
  return value && !Number.isNaN(date.valueOf()) ? new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", ...(value.length === 10 ? { timeZone: "UTC" } : {}),
  }).format(date) : "—";
}
