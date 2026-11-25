"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon, Modal, useAdmin } from "./AdminShell";
import { adminHref, cellValue, fieldLabel, fieldOptions, getModule, moduleFields, validateRow, type AdminModule, type Row } from "./adminData";
import { DemoNote, Empty, PageHeader, Status, downloadCsv, formatDate } from "./adminUi";
import s from "./admin.module.css";

const pageSize = 8;

export function RecordList({ module }: { module: AdminModule }) {
  const { data } = useAdmin();
  const { records } = data;
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState({ key: module.columns[0], direction: 1 });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const root = adminHref(module.id);
  const rows = records[module.id];
  const value = (row: Row, key: string) => cellValue(module, row, key, records);
  const query = search.trim().toLowerCase();
  const filtered = rows.filter((row) => Object.entries(filters).every(([key, filter]) => !filter || value(row, key) === filter)
    && (!query || module.columns.some((key) => value(row, key).toLowerCase().includes(query))))
    .sort((a, b) => sort.direction * value(a, sort.key).localeCompare(value(b, sort.key), undefined, { numeric: true, sensitivity: "base" }));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const allChecked = visible.length > 0 && visible.every(({ id }) => selected.includes(id));
  const selectedRows = filtered.filter(({ id }) => selected.includes(id));

  function exportRows() {
    downloadCsv(module.id, [module.columns.map((key) => fieldLabel(module, key)),
      ...(selectedRows.length ? selectedRows : filtered).map((row) => module.columns.map((key) => value(row, key)))]);
  }

  return <>
    <PageHeader title={module.label} description={module.description} actions={<Link className={s.primary} href={root + "/new"}><Icon name="plus" />{module.action}</Link>} />
    <DemoNote />
    <section className={s.panel} aria-label={module.label + " records"}>
      <div className={s.toolbar}>
        <label className={s.field}><span>Search {module.label.toLowerCase()}</span><input type="search" value={search} placeholder="Search records…" onChange={(e) => { setSearch(e.target.value); setPage(0); setSelected([]); }} /></label>
        {module.filters.map((key) => <label className={s.field} key={key}><span>{fieldLabel(module, key)}</span>
          <select value={filters[key] ?? ""} onChange={(e) => { setFilters({ ...filters, [key]: e.target.value }); setPage(0); setSelected([]); }}>
            <option value="">All</option>{Array.from(new Set(rows.map((row) => value(row, key)).filter(Boolean))).sort().map((item) => <option key={item}>{item}</option>)}
          </select></label>)}
      </div>
      <div className={s.tableTools}>
        <p>{filtered.length} {filtered.length === 1 ? "record" : "records"}{selectedRows.length > 0 && " · " + selectedRows.length + " selected"}</p>
        <div className={s.actions}>
          {(query || Object.values(filters).some(Boolean)) && <button className={s.secondary} onClick={() => { setSearch(""); setFilters({}); setPage(0); setSelected([]); }}>Reset filters</button>}
          <button className={s.secondary} disabled={!filtered.length} onClick={exportRows}><Icon name="download" size={16} />{selectedRows.length ? "Export selected" : "Export CSV"}</button>
        </div>
      </div>
      {visible.length ? <div className={s.tableWrap} tabIndex={0} aria-label="Scrollable records table"><table className={s.table} data-pinned-actions>
        <thead><tr><th scope="col"><input type="checkbox" aria-label="Select all records on this page" checked={allChecked} onChange={() => {
          const ids = visible.map(({ id }) => id);
          setSelected(allChecked ? selected.filter((id) => !ids.includes(id)) : Array.from(new Set([...selected, ...ids])));
        }} /></th>
        {module.columns.map((key) => <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction === 1 ? "ascending" : "descending" : undefined}>
          <button className={s.sort} onClick={() => { setSort({ key, direction: sort.key === key ? -sort.direction : 1 }); setPage(0); }}>{fieldLabel(module, key)}{sort.key === key && (sort.direction === 1 ? " ↑" : " ↓")}</button>
        </th>)}<th scope="col">Actions</th></tr></thead>
        <tbody>{visible.map((row) => <tr key={row.id}>
          <td><input type="checkbox" aria-label={"Select " + (value(row, module.columns[0]) || row.id)} checked={selected.includes(row.id)}
            onChange={(e) => setSelected(e.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} /></td>
          {module.columns.map((key, index) => <td key={key} data-column={key}>{key === "status" ? <Status value={value(row, key)} />
            : index === 0 ? <Link className={s.textLink} href={root + "/" + row.id}>{value(row, key) || "View record"}</Link>
            : key.endsWith("Date") ? formatDate(value(row, key)) : value(row, key) || "—"}</td>)}
          <td><Link className={s.textLink} href={root + "/" + row.id + "/edit"} aria-label={"Edit " + (value(row, module.columns[0]) || row.id)}>Edit</Link></td>
        </tr>)}</tbody>
      </table></div> : <Empty title="No matching records" detail={rows.length ? "Adjust the search or filters and try again." : "Add a record to get started."} />}
      <div className={s.pagination}><span>Page {currentPage + 1} of {pages}</span><div className={s.actions}><button className={s.secondary} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><button className={s.secondary} disabled={currentPage + 1 === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
    </section>
  </>;
}

export function RecordEditor({ module, row }: { module: AdminModule; row?: Row }) {
  const { data, update, notice } = useAdmin();
  const params = useSearchParams();
  const router = useRouter();
  const root = adminHref(module.id);
  const { records } = data;
  const fields = moduleFields(module);
  const [values, setValues] = useState<Record<string, string>>(() => row ?? Object.fromEntries(fields.map((field) => [
    field.key, field.key === "academicYear" ? data.settings.defaultYear : field.key === "department" && records.departments.some((item) => item.id === params.get("department"))
      ? params.get("department") ?? "" : field.defaultValue ?? "",
  ])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  function change(key: string, value: string) {
    const next = { ...values, [key]: value };
    for (const field of fields) {
      if (!field.match?.length) continue;
      const options = fieldOptions(field, next, records);
      if (field.key === "section") next.section = options?.[0]?.value ?? "";
      else if (next[field.key] && !options?.some((option) => option.value === next[field.key])) next[field.key] = "";
    }
    setValues(next);
    setErrors({});
  }

  function save() {
    const saved: Row = { ...Object.fromEntries(fields.map(({ key }) => [key, values[key]?.trim() ?? ""])), id: row?.id ?? crypto.randomUUID() };
    const replacement = module.id === "hod" && row?.status === "Active" && saved.status === "Active"
      && (row.faculty !== saved.faculty || row.department !== saved.department);
    if (replacement) saved.id = crypto.randomUUID();
    const label = saved.name || cellValue(module, saved, module.columns[0], records) || module.singular;
    update((state) => ({
      ...state, records: { ...state.records, [module.id]: replacement
        ? [...state.records.hod.map((item) => item.id === row.id ? { ...item, status: "Ended", endDate: saved.startDate } : item), saved]
        : row ? state.records[module.id].map((item) => item.id === row.id ? saved : item) : [...state.records[module.id], saved] },
    }), { module: module.label, action: replacement ? "Changed appointment" : row ? "Updated" : "Created", recordId: saved.id,
      detail: module.id === "allocations" ? ["faculty", "subject", "classId", "status"].map((key) => cellValue(module, saved, key, records)).join(" · ") : label });
    notice(label + " saved.");
    router.push(root + "/" + saved.id);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateRow(module, values, records, row?.id);
    if (module.id === "hod" && row?.status === "Active" && values.status === "Active" &&
      (row.faculty !== values.faculty || row.department !== values.department) && values.startDate < row.startDate) {
      validation.startDate = "The replacement cannot start before the current appointment.";
    }
    setErrors(validation);
    if (Object.keys(validation).length) {
      document.getElementById("admin-field-" + Object.keys(validation)[0])?.focus();
      return;
    }
    if (module.id === "hod" || module.id === "allocations") setConfirming(true);
    else save();
  }

  return <>
    <PageHeader title={row ? "Edit " + module.singular : module.action} description={module.description}
      actions={<Link className={s.secondary} href={row ? root + "/" + row.id : root}>Cancel</Link>} />
    <DemoNote />
    <form className={s.form} onSubmit={submit}>
      {Object.keys(errors).length > 0 && <p role="alert" className={s.error}>Review the highlighted fields before saving.</p>}
      {module.groups.map((group) => <fieldset key={group.label} className={s.formPanel}><legend>{group.label}</legend>
        <div className={s.formGrid}>{group.fields.map((field) => {
          const id = "admin-field-" + field.key;
          const options = fieldOptions(field, values, records);
          const props = { id, value: values[field.key] ?? "", required: field.required, "aria-invalid": !!errors[field.key],
            "aria-describedby": errors[field.key] ? id + "-error" : undefined,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => change(field.key, e.target.value) };
          return <label className={s.field} data-wide={field.type === "textarea"} key={field.key}>
            <span>{field.label}{field.required && <span className={s.required} aria-hidden="true"> *</span>}</span>
            {options ? <select {...props}>
              <option value="">{options.length ? "Select " + field.label.toLowerCase() : "No matching options"}</option>
              {options.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select> : field.type === "textarea" ? <textarea {...props} rows={4} />
              : <input {...props} type={field.type ?? "text"} min={field.min} max={field.max} />}
            {errors[field.key] && <small className={s.fieldError} id={id + "-error"}>{errors[field.key]}</small>}
          </label>;
        })}</div>
      </fieldset>)}
      <div className={s.formActions}><Link className={s.secondary} href={row ? root + "/" + row.id : root}>Cancel</Link><button className={s.primary}>Save {module.singular}</button></div>
    </form>
    {confirming && <Modal title="Confirm changes" onClose={() => setConfirming(false)}>
      <p>Save this {module.singular} to the demo workspace?</p>
      <dl className={s.details}>{module.columns.filter((key) => ["faculty", "department", "classId", "subject", "startDate", "status"].includes(key)).map((key) => <div key={key}>
        <dt>{fieldLabel(module, key)}</dt><dd>{key === "startDate" ? formatDate(values[key]) : cellValue(module, { ...values, id: row?.id ?? "" }, key, records)}</dd>
      </div>)}</dl>
      <div className={s.formActions}><button className={s.secondary} onClick={() => setConfirming(false)}>Go back</button><button className={s.primary} onClick={save}>Confirm and save</button></div>
    </Modal>}
  </>;
}

export function RecordDetails({ module, row }: { module: AdminModule; row: Row }) {
  const { data, update, notice } = useAdmin();
  const { records } = data;
  const [revoking, setRevoking] = useState(false);
  const root = adminHref(module.id);
  const title = row.name || cellValue(module, row, module.columns[0], records) || module.label;
  const assignments = records.allocations.filter((item) => item.faculty === row.id);
  const appointment = records.hod.find((item) => item.status === "Active" && (module.id === "faculty" ? item.faculty : item.department) === row.id);
  const history = data.audit.filter(({ recordId }) => recordId === row.id);
  return <>
    <PageHeader title={title} description={module.label + " record"} actions={<div className={s.actions}>
      <Link className={s.secondary} href={root}>Back to list</Link><Link className={s.primary} href={root + "/" + row.id + "/edit"}>Edit {module.singular}</Link>
    </div>} />
    <DemoNote />
    {module.groups.map((group) => <section key={group.label} className={s.card}>
      <h2>{group.label}</h2><dl className={s.details}>{group.fields.map(({ key, label, type }) => {
        const value = cellValue(module, row, key, records);
        return <div key={key}><dt>{label}</dt><dd>{key === "status" && value ? <Status value={value} /> : type === "date" ? formatDate(value) : value || "—"}</dd></div>;
      })}</dl>
    </section>)}
    {module.id === "faculty" && <section className={s.card}><h2>Teaching workload</h2>
      <p>{assignments.filter(({ status }) => status === "Active").length} active allocations across {cellValue(module, row, "assignedClasses", records)} classes.</p>
      {assignments.length ? <ul className={s.linkList}>{assignments.map((item) => <li key={item.id}><Link className={s.textLink} href={"/admin/allocations/" + item.id}>
        {["subject", "classId", "academicYear"].map((key) => cellValue(getModule("allocations")!, item, key, records)).join(" · ")}
      </Link><Status value={item.status} /></li>)}</ul> : <p>No teaching assignments recorded.</p>}
    </section>}
    {(module.id === "faculty" || module.id === "departments") && <section className={s.card}><h2>Department leadership</h2>
      {appointment ? <Link className={s.textLink} href={"/admin/hod/" + appointment.id}>{records.faculty.find(({ id }) => id === appointment.faculty)?.name} · View appointment</Link> :
      <p>No active HOD appointment.</p>}
      {module.id === "departments" && <div className={s.actions}><Link className={s.secondary} href={appointment ? "/admin/hod/" + appointment.id + "/edit" : "/admin/hod/new?department=" + encodeURIComponent(row.id)}>{appointment ? "Change appointment" : "Appoint HOD"}</Link></div>}
    </section>}
    {module.id === "hod" && row.status === "Active" && <section className={s.card}><h2>Appointment actions</h2><button className={s.danger} onClick={() => setRevoking(true)}>Revoke appointment</button></section>}
    {module.id === "allocations" && <section className={s.card}><h2>Allocation history</h2>
      {history.length ? <ul className={s.timeline}>{history.map((item) => <li key={item.id}>
        <div><strong>{item.action} · {item.detail}</strong><small>{item.user} · {formatDate(item.at)}</small></div>
      </li>)}</ul> : <p>No changes recorded for this sample allocation.</p>}
    </section>}
    {revoking && <Modal title="Revoke HOD appointment?" onClose={() => setRevoking(false)}>
      <p>This appointment will remain in the department’s history.</p>
      <div className={s.formActions}><button className={s.secondary} onClick={() => setRevoking(false)}>Cancel</button><button className={s.danger} onClick={() => {
        const today = new Date().toISOString().slice(0, 10);
        update((state) => ({ ...state, records: { ...state.records, hod: state.records.hod.map((item) =>
          item.id === row.id ? { ...item, status: "Revoked", endDate: today > item.startDate ? today : item.startDate } : item) } }),
        { action: "Revoked", module: module.label, detail: title });
        setRevoking(false);
        notice("Appointment revoked.");
      }}>Revoke appointment</button></div>
    </Modal>}
  </>;
}
