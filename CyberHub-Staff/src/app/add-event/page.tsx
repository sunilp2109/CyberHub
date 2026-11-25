"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { SDG_LIST, eventsUrl, type EventMode } from "@/lib/facultyEvents";
import s from "./add-event.module.css";

/* ══════════════════════════════════════════════════
   TYPES & CONSTANTS
══════════════════════════════════════════════════ */
const FOCUS_AREAS = [
  "Cybersecurity", "Artificial Intelligence", "Research", "Innovation",
  "Entrepreneurship", "Skill Development", "Social Responsibility", "Sustainability",
  "Public Policy", "Data Science", "IoT & Embedded Systems", "Cloud Computing",
];

const EVENT_TYPES = ["Conference", "Workshop", "Seminar", "FDP", "Webinar", "Symposium", "Guest Lecture", "Hackathon", "Competition", "Exhibition", "Training Program", "Other"];

interface FormData {
  // Step 1
  eventName: string; eventType: string; customEventType: string; organizer: string; department: string;
  eventDate: string; startTime: string; endTime: string; venue: string;
  format: string;
  // Step 2
  description: string; objectives: string; keyTopics: string; eventOutcome: string;
  chiefGuest: string; numParticipants: string; targetAudience: string; coordinators: string;
  // Step 3
  facultyRole: string; participationType: string; certificate: File | null;
  organizingResponsibility: string;
  // Step 4
  sdgs: number[]; focusAreas: string[]; customFocusArea: string | null;
}

const INITIAL: FormData = {
  eventName:"", eventType:"", customEventType:"", organizer:"", department:"", eventDate:"", startTime:"", endTime:"", venue:"", format:"offline",
  description:"", objectives:"", keyTopics:"", eventOutcome:"", chiefGuest:"", numParticipants:"", targetAudience:"", coordinators:"",
  facultyRole:"", participationType:"", certificate: null, organizingResponsibility:"",
  sdgs:[], focusAreas:[], customFocusArea: null,
};

const STEPS = [
  { num:1, label:"Event Setup",       sub:"Event mode & type"       },
  { num:2, label:"Basic Information", sub:"Event name, date & venue" },
  { num:3, label:"Event Details",     sub:"Description & outcomes"  },
  { num:4, label:"Participation",     sub:"Role & responsibilities" },
  { num:5, label:"SDG & Focus",       sub:"Align to goals"           },
  { num:6, label:"Review & Save",    sub:"Final check"             },
];

function getEventType(data: FormData) {
  return data.eventType === "Other" ? data.customEventType.trim() : data.eventType;
}

const EVENT_MODES: { value: EventMode; label: string; description: string }[] = [
  { value: "attended", label: "Attended", description: "You took part in an event organized by someone else." },
  { value: "conducted", label: "Conducted", description: "You organized, coordinated, or ran the event." },
];

/* ══════════════════════════════════════════════════
   SMALL ICON COMPONENTS
══════════════════════════════════════════════════ */
const Ico = {
  Check:  () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Arrow:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Back:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Submit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Pin:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Tag:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  User:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

/* ══════════════════════════════════════════════════
   STEP COMPONENTS
══════════════════════════════════════════════════ */

/* ── Step 1: Basic Information ── */
function Step1({ data, set }: { data:FormData; set:(k:keyof FormData,v:unknown)=>void }) {
  const formats = [
    { val:"offline", label:"Offline" },
    { val:"online",  label:"Online"  },
    { val:"hybrid",  label:"Hybrid"  },
  ];
  return (
    <div className={s.stepCardBody}>
      <div className={s.formRow}>
        <div className={`${s.formGroup} ${s.formGroupFull}`}>
          <label className={s.fieldLabel} htmlFor="eventName">Event Name <span className={s.required}>*</span></label>
          <input id="eventName" className={s.fieldInput} placeholder="e.g. National Cybersecurity Summit 2024"
            value={data.eventName} onChange={e=>set("eventName",e.target.value)}/>
        </div>
      </div>
      <div className={s.formRow}>
        <div className={s.formGroup}>
          <label className={s.fieldLabel} htmlFor="organizer">Organizer / Institution <span className={s.required}>*</span></label>
          <input id="organizer" className={s.fieldInput} placeholder="e.g. IIT Madras / IEEE"
            value={data.organizer} onChange={e=>set("organizer",e.target.value)}/>
        </div>
      </div>
      <div className={s.formRow}>
        <div className={s.formGroup}>
          <label className={s.fieldLabel} htmlFor="department">Department</label>
          <input id="department" className={s.fieldInput} placeholder="e.g. Computer Science & Engineering"
            value={data.department} onChange={e=>set("department",e.target.value)}/>
        </div>
        <div className={s.formGroup}>
          <label className={s.fieldLabel} htmlFor="eventDate">Event Date <span className={s.required}>*</span></label>
          <input id="eventDate" type="date" className={s.fieldInput} value={data.eventDate} onChange={e=>set("eventDate",e.target.value)}/>
        </div>
      </div>
      <div className={s.formRow3}>
        <div className={s.formGroup}>
          <label className={s.fieldLabel} htmlFor="startTime">Start Time</label>
          <input id="startTime" type="time" className={s.fieldInput} value={data.startTime} onChange={e=>set("startTime",e.target.value)}/>
        </div>
        <div className={s.formGroup}>
          <label className={s.fieldLabel} htmlFor="endTime">End Time</label>
          <input id="endTime" type="time" className={s.fieldInput} value={data.endTime} onChange={e=>set("endTime",e.target.value)}/>
        </div>
        <div className={s.formGroup}>
          <label className={s.fieldLabel} htmlFor="duration">Duration</label>
          <input id="duration" className={s.fieldInput} placeholder="e.g. 2 Days" disabled
            value={data.startTime && data.endTime && data.endTime > data.startTime
              ? `${Number(data.endTime.slice(0, 2)) * 60 + Number(data.endTime.slice(3)) - Number(data.startTime.slice(0, 2)) * 60 - Number(data.startTime.slice(3))} min`
              : ""}/>
        </div>
      </div>
      <div className={s.formGroup}>
        <label className={s.fieldLabel}><Ico.Pin /> Venue / Host Institution</label>
        <div className={s.venueWrapper}>
          <span className={s.venueIcon}><Ico.Pin /></span>
          <input className={`${s.fieldInput} ${s.venueInput}`}
            placeholder="e.g. Main Auditorium, Building A / Zoom / Google Meet"
            value={data.venue} onChange={e=>set("venue",e.target.value)}/>
        </div>
      </div>
      <div className={s.formGroup}>
        <label className={s.fieldLabel}>Event Format <span className={s.required}>*</span></label>
        <div className={s.formatToggle}>
          {formats.map(f=>(
            <button key={f.val} type="button"
              className={`${s.formatBtn} ${data.format===f.val ? s.formatBtnActive:""}`}
              onClick={()=>set("format",f.val)}>
              {f.val==="offline"?"🏢":f.val==="online"?"💻":"🌐"} {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Event Details ── */
function Step2({ data, set, mode }: { data:FormData; set:(k:keyof FormData,v:unknown)=>void; mode:EventMode }) {
  return (
    <div className={s.stepCardBody}>
      <div className={s.formGroup}>
        <label className={s.fieldLabel} htmlFor="description">Description <span className={s.required}>*</span></label>
        <textarea id="description" className={s.fieldTextarea} rows={4}
          placeholder="Provide a comprehensive description of the event, its context and significance…"
          value={data.description} onChange={e=>set("description",e.target.value)}/>
      </div>
      <div className={s.formGroup}>
        <label className={s.fieldLabel} htmlFor="objectives">Objectives</label>
        <textarea id="objectives" className={s.fieldTextarea} rows={3}
          placeholder="List the key objectives of this event (one per line)…"
          value={data.objectives} onChange={e=>set("objectives",e.target.value)}/>
      </div>
      <div className={s.formRow}>
        <div className={s.formGroup}>
          <label className={s.fieldLabel} htmlFor="keyTopics">Key Topics Covered</label>
          <textarea id="keyTopics" className={s.fieldTextarea} rows={3}
            placeholder="e.g. Zero Trust Security, Network Forensics, AI in Threat Detection…"
            value={data.keyTopics} onChange={e=>set("keyTopics",e.target.value)}/>
        </div>
        <div className={s.formGroup}>
          <label className={s.fieldLabel} htmlFor="eventOutcome">Event Outcome / Learning</label>
          <textarea id="eventOutcome" className={s.fieldTextarea} rows={3}
            placeholder="What was achieved or learned from this event?"
            value={data.eventOutcome} onChange={e=>set("eventOutcome",e.target.value)}/>
        </div>
      </div>

      {mode==="conducted" && (
        <div className={s.conductedSection}>
          <div className={s.conductedTag}><Ico.Tag/> Conducted Event — Additional Details</div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.fieldLabel} htmlFor="chiefGuest">Chief Guest / Speaker</label>
              <input id="chiefGuest" className={s.fieldInput} placeholder="e.g. Dr. A.P.J Abdul Kalam"
                value={data.chiefGuest} onChange={e=>set("chiefGuest",e.target.value)}/>
            </div>
            <div className={s.formGroup}>
              <label className={s.fieldLabel}>Number of Participants</label>
              <input type="number" className={s.fieldInput} min="1" placeholder="e.g. 120"
                value={data.numParticipants} onChange={e=>set("numParticipants",e.target.value)}/>
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.fieldLabel} htmlFor="targetAudience">Target Audience</label>
              <input id="targetAudience" className={s.fieldInput} placeholder="e.g. UG Students, Industry Professionals"
                value={data.targetAudience} onChange={e=>set("targetAudience",e.target.value)}/>
            </div>
            <div className={s.formGroup}>
              <label className={s.fieldLabel} htmlFor="coordinators">Coordinators</label>
              <input id="coordinators" className={s.fieldInput} placeholder="Names of co-organizers…"
                value={data.coordinators} onChange={e=>set("coordinators",e.target.value)}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Step 3: Participation ── */
function Step3({ data, set, mode }: { data:FormData; set:(k:keyof FormData,v:unknown)=>void; mode:EventMode }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const attendedRoles      = ["Participant","Speaker","Panelist","Session Chair","Invited Expert","Observer"];
  const participationTypes = ["In-person","Virtual / Online","Hybrid"];
  const conductedRoles     = ["Coordinator","Co-Coordinator","Organizer","Resource Person","Mentor","Judge","Evaluator"];
  const orgResponsibilities= ["Event Planning","Technical Coordination","Logistics","Registration","Media & Promotion","Budget Management","All of the above"];

  return (
    <div className={s.stepCardBody}>
      {mode === "attended" ? (
        <>
          <div className={s.formGroup}>
            <label className={s.fieldLabel}>Your Role at the Event <span className={s.required}>*</span></label>
            <div className={s.radioCards}>
              {attendedRoles.map(r=>(
                <button key={r} type="button"
                  className={`${s.radioCard} ${data.facultyRole===r?s.radioCardActive:""}`}
                  onClick={()=>set("facultyRole",r)}>
                  <div className={`${s.radioCardDot} ${data.facultyRole===r?s.radioCardDotActive:""}`}>
                    {data.facultyRole===r && <div className={s.radioInner}/>}
                  </div>
                  <div><div className={s.radioCardLabel}>{r}</div></div>
                </button>
              ))}
            </div>
          </div>
          <div className={s.formGroup}>
            <label className={s.fieldLabel}>Participation Type <span className={s.required}>*</span></label>
            <div className={s.formatToggle}>
              {participationTypes.map(p=>(
                <button key={p} type="button"
                  className={`${s.formatBtn} ${data.participationType===p?s.formatBtnActive:""}`}
                  onClick={()=>set("participationType",p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className={s.certificateRow}>
            <div>
              <p className={s.fieldLabel}>Participation certificate (optional)</p>
              <p className={s.certificateHint}>PDF, PNG, or JPG up to 5 MB.</p>
              {data.certificate && <p className={s.certificateName}>{data.certificate.name}</p>}
            </div>
            <div className={s.certificateActions}>
              <input id="event-certificate" ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)
                    || file.size === 0 || file.size > 5 * 1024 * 1024) {
                    setFileError("Choose a PDF, PNG, or JPG file up to 5 MB.");
                    return;
                  }
                  if (file.name.length > 200) {
                    setFileError("Use a file name of up to 200 characters.");
                    return;
                  }
                  setFileError("");
                  set("certificate", file);
                }} />
              <button type="button" className={s.certificateButton} onClick={() => fileInput.current?.click()}>
                {data.certificate ? "Replace certificate" : "Upload certificate"}
              </button>
              {data.certificate && <button type="button" className={s.certificateRemove} onClick={() => {
                set("certificate", null);
                setFileError("");
              }}>Remove</button>}
            </div>
            {fileError && <p className={s.certificateError} role="alert">{fileError}</p>}
          </div>
        </>
      ) : (
        <>
          <div className={s.formGroup}>
            <label className={s.fieldLabel}>Your Role in Conducting the Event <span className={s.required}>*</span></label>
            <div className={s.radioCards}>
              {conductedRoles.map(r=>(
                <button key={r} type="button"
                  className={`${s.radioCard} ${data.facultyRole===r?s.radioCardActive:""}`}
                  onClick={()=>set("facultyRole",r)}>
                  <div className={`${s.radioCardDot} ${data.facultyRole===r?s.radioCardDotActive:""}`}>
                    {data.facultyRole===r && <div className={s.radioInner}/>}
                  </div>
                  <div><div className={s.radioCardLabel}>{r}</div></div>
                </button>
              ))}
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.fieldLabel}>Number of Participants <span className={s.required}>*</span></label>
              <input type="number" className={s.fieldInput} min="1" placeholder="Total attendees"
                value={data.numParticipants} onChange={e=>set("numParticipants",e.target.value)}/>
            </div>
          </div>
          <div className={s.formGroup}>
            <label className={s.fieldLabel}>Organizing Responsibilities</label>
            <div className={s.radioCards}>
              {orgResponsibilities.map(r=>(
                <button key={r} type="button"
                  className={`${s.radioCard} ${data.organizingResponsibility===r?s.radioCardActive:""}`}
                  onClick={()=>set("organizingResponsibility",r)}>
                  <div className={`${s.radioCardDot} ${data.organizingResponsibility===r?s.radioCardDotActive:""}`}>
                    {data.organizingResponsibility===r && <div className={s.radioInner}/>}
                  </div>
                  <div><div className={s.radioCardLabel}>{r}</div></div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Step 4: SDG & Focus ── */
function Step4({ data, set }: { data:FormData; set:(k:keyof FormData,v:unknown)=>void }) {
  const toggleSDG = (n:number) => {
    const arr = data.sdgs.includes(n) ? data.sdgs.filter(x=>x!==n) : [...data.sdgs, n];
    set("sdgs", arr);
  };
  const toggleFocus = (f:string) => {
    const arr = data.focusAreas.includes(f) ? data.focusAreas.filter(x=>x!==f) : [...data.focusAreas, f];
    set("focusAreas", arr);
  };
  return (
    <div className={s.stepCardBody}>
      <div>
        <div className={s.sectionDivider}>Sustainable Development Goals (SDGs)</div>
        <p style={{fontSize:"0.78rem",color:"var(--text-muted)",marginBottom:"0.8rem",marginTop:"0.3rem"}}>Select all SDGs this event addresses. Multiple selection allowed.</p>
        <div className={s.sdgGrid}>
          {SDG_LIST.map(sdg=>{
            const active = data.sdgs.includes(sdg.n);
            return (
              <button key={sdg.n} type="button"
                className={`${s.sdgCard} ${active?s.sdgCardActive:""}`}
                onClick={()=>toggleSDG(sdg.n)}>
                {active && <div className={s.sdgCheck}><Ico.Check/></div>}
                <div className={s.sdgNum}>{sdg.n}</div>
                <div className={s.sdgName}>{sdg.name}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className={s.sectionDivider}>Institutional Focus Areas</div>
        <p style={{fontSize:"0.78rem",color:"var(--text-muted)",marginBottom:"0.8rem",marginTop:"0.3rem"}}>Select specific academic or research domains relevant to this event.</p>
        <div className={s.focusGrid}>
          {FOCUS_AREAS.map(f=>{
            const active = data.focusAreas.includes(f);
            return (
              <button key={f} type="button"
                className={`${s.focusChip} ${active?s.focusChipActive:""}`}
                aria-pressed={active}
                onClick={()=>toggleFocus(f)}>
                {active && <Ico.Check/>} {f}
              </button>
            );
          })}
          <button type="button" className={`${s.focusChip} ${data.customFocusArea !== null ? s.focusChipActive : ""}`}
            aria-pressed={data.customFocusArea !== null}
            onClick={() => set("customFocusArea", data.customFocusArea === null ? "" : null)}>
            {data.customFocusArea !== null && <Ico.Check />} Other
          </button>
        </div>
        {data.customFocusArea !== null && (
          <div className={s.customFocusField}>
            <label className={s.fieldLabel} htmlFor="custom-focus-area">Specify focus area <span className={s.required} aria-hidden="true">*</span></label>
            <input id="custom-focus-area" type="text" className={s.fieldInput} value={data.customFocusArea}
              onChange={(event) => set("customFocusArea", event.target.value)} maxLength={100}
              placeholder="e.g. Digital Accessibility" aria-describedby="custom-focus-help" required />
            <p id="custom-focus-help" className={s.customFocusHelp}>Enter a focus area to continue. Up to 100 characters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step 6: Review ── */
function getFocusAreas(focusAreas: string[], customFocusArea: string | null) {
  const custom = customFocusArea?.trim();
  return custom && !focusAreas.some((area) => area.toLowerCase() === custom.toLowerCase())
    ? [...focusAreas, custom] : focusAreas;
}

function encodeCertificate(file: File) {
  return new Promise<{ fileName: string; mimeType: string; content: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ fileName: file.name, mimeType: file.type, content: String(reader.result).split(",")[1] });
    reader.onerror = () => reject(new Error("Unable to read the certificate. Try selecting the file again."));
    reader.readAsDataURL(file);
  });
}

function Step6({ data, mode, goTo }: { data:FormData; mode:EventMode; goTo:(s:number)=>void }) {
  const field = (label:string, val:string|boolean|undefined) => val ? (
    <div className={s.reviewRow}>
      <span className={s.reviewLabel}>{label}</span>
      <span className={s.reviewValue}>{String(val)}</span>
    </div>
  ) : null;

  return (
    <div className={s.stepCardBody}>
      <p style={{fontSize:"0.82rem",color:"var(--text-secondary)"}}>
        Please review all information carefully before saving.
      </p>
      <div className={s.reviewGrid}>

        <div className={s.reviewSection}>
          <div className={s.reviewSectionHeader}>
            📋 Basic Information
            <button className={s.reviewEditBtn} onClick={()=>goTo(2)}>Edit</button>
          </div>
          <div className={s.reviewBody}>
            {field("Event Name", data.eventName || "—")}
            {field("Event Type", getEventType(data))}
            {field("Organizer",  data.organizer  || "—")}
            {field("Department", data.department || "—")}
            {field("Date",       data.eventDate  || "—")}
            {field("Time",       data.startTime ? `${data.startTime} – ${data.endTime}` : "—")}
            {field("Venue",      data.venue      || "—")}
            {field("Format",     data.format     || "—")}
          </div>
        </div>

        <div className={s.reviewSection}>
          <div className={s.reviewSectionHeader}>
            📝 Event Details
            <button className={s.reviewEditBtn} onClick={()=>goTo(3)}>Edit</button>
          </div>
          <div className={s.reviewBody}>
            {field("Description", data.description ? data.description.slice(0,100)+"…" : "—")}
            {field("Objectives",  data.objectives ? data.objectives.slice(0,80)+"…" : "—")}
            {field("Key Topics",  data.keyTopics  || "—")}
            {field("Outcome",     data.eventOutcome || "—")}
            {mode==="conducted" && field("Chief Guest",   data.chiefGuest    || "—")}
            {mode==="conducted" && field("Participants",  data.numParticipants || "—")}
            {mode==="conducted" && field("Audience",      data.targetAudience  || "—")}
          </div>
        </div>

        <div className={s.reviewSection}>
          <div className={s.reviewSectionHeader}>
            👤 Participation
            <button className={s.reviewEditBtn} onClick={()=>goTo(4)}>Edit</button>
          </div>
          <div className={s.reviewBody}>
            {field("Faculty Role",        data.facultyRole        || "—")}
            {mode==="attended" && field("Participation Type", data.participationType || "—")}
            {mode==="attended" && field("Certificate",        data.certificate?.name ?? "No file attached")}
            {mode==="conducted" && field("Responsibility",    data.organizingResponsibility || "—")}
          </div>
        </div>

        <div className={s.reviewSection}>
          <div className={s.reviewSectionHeader}>
            Institutional Focus Areas
            <button className={s.reviewEditBtn} onClick={()=>goTo(5)}>Edit</button>
          </div>
          <div className={s.reviewBody}>
            {field("Focus Areas", getFocusAreas(data.focusAreas, data.customFocusArea).join(", ") || "None selected")}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
══════════════════════════════════════════════════ */
export default function AddEventPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<EventMode | null>(null);
  const [step, setStep]       = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [data, setData]       = useState<FormData>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const setField = (k:keyof FormData, v:unknown) => setData(p=>({...p,[k]:v}));
  const lastStep = STEPS.length;
  const eventType = getEventType(data);
  const focusAreaValid = data.customFocusArea === null || data.customFocusArea.trim().length > 0;
  const availableStep = mode && eventType ? (focusAreaValid ? lastStep : lastStep - 1) : 1;
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const goTo = (nextStep: number) => {
    if (nextStep < 1 || nextStep > availableStep || nextStep === step) return;
    setStep(nextStep);
    setFurthestStep((current) => Math.max(current, nextStep));
    requestAnimationFrame(() => stepTitle.current?.focus());
  };
  const progress = ((step - 1) / (lastStep - 1)) * 100;

  const chooseMode = (nextMode: EventMode) => {
    if (mode === nextMode) return;
    setMode(nextMode);
    setData((current) => ({
      ...current,
      facultyRole: nextMode === "conducted" ? "Coordinator" : "",
      participationType: "",
      certificate: null,
      organizingResponsibility: "",
      chiefGuest: "",
      numParticipants: "",
      targetAudience: "",
      coordinators: "",
    }));
  };

  const saveEvent = async () => {
    if (!mode || !focusAreaValid || saving) return;
    setSaveError("");
    setSaving(true);
    try {
      const { customFocusArea, certificate, ...event } = data;
      const certificateUpload = certificate ? await encodeCertificate(certificate).catch(() => null) : undefined;
      if (certificateUpload === null) {
        setSaveError("Unable to read the certificate. Select it again and retry.");
        return;
      }
      const response = await fetch(eventsUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...event, mode, eventType, focusAreas: getFocusAreas(event.focusAreas, customFocusArea),
          certAvailable: Boolean(certificateUpload), certificate: certificateUpload }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        setSaveError(payload?.error?.message ?? "The event could not be saved.");
        return;
      }
      setSubmitted(true);
    } catch {
      setSaveError("Unable to reach the event service. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const stepTitles: Record<number,{title:string;sub:string}> = {
    1:{ title:"Event Setup",        sub:"Choose how you were involved and what type of event it was." },
    2:{ title:"Basic Information",  sub:"Enter the event name, organizer, date, and venue." },
    3:{ title:"Event Details",      sub:"Describe the event content, objectives and outcomes." },
    4:{ title:"Participation",      sub:"Specify your role and level of involvement." },
    5:{ title:"SDG & Focus Areas",  sub:"Align this event with institutional goals." },
    6:{ title:"Review & Save", sub:"Confirm the details before saving to My Events." },
  };

  return (
    <MainLayout
      breadcrumbs={[{label:"Dashboard",href:"/dashboard"},{label:"My Events",href:"/events"},{label:"Add Event"}]}
      userName="Sunil P"
    >
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>Add Event</h1>
          <p className={s.pageSubtitle}>Create a complete record of your academic or professional activity.</p>
        </div>
        <div className={s.headerActions}>
          <button className={s.discardBtn} onClick={()=>router.push("/events")}>Discard</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={s.progressBar}>
        <div className={s.progressFill} style={{width:`${progress}%`}}/>
      </div>

      {/* Two-column layout */}
      <div className={s.formLayout}>
        {/* Step Navigator */}
        <nav className={s.stepNav} aria-label="Form steps">
          <div className={s.stepNavHeader}>Form Sections</div>
          <div className={s.stepNavList}>
            {STEPS.map((st,i)=>(
              <div key={st.num}>
                <button type="button"
                  className={`${s.stepNavItem} ${step===st.num?s.stepNavItemActive:""}`}
                  onClick={()=>goTo(st.num)}
                  disabled={st.num > Math.min(availableStep, furthestStep)}
                  aria-current={step===st.num?"step":undefined}>
                  <div className={`${s.stepCircle} ${step===st.num?s.stepCircleActive:""} ${step>st.num?s.stepCircleDone:""}`}>
                    {step>st.num ? <Ico.Check/> : st.num}
                  </div>
                  <div className={s.stepNavLabels}>
                    <div className={s.stepNavName}>{st.label}</div>
                    <div className={s.stepNavSub}>{st.sub}</div>
                  </div>
                </button>
                {i < STEPS.length-1 && <div className={s.stepConnector}/>}
              </div>
            ))}
          </div>
        </nav>

        {/* Step Content */}
        <div className={s.stepCard}>
          <div className={s.stepCardHeader}>
            <h2 className={s.stepCardTitle} ref={stepTitle} tabIndex={-1}>{stepTitles[step].title}</h2>
            <p className={s.stepCardSubtitle}>{stepTitles[step].sub}</p>
            {step > 1 && mode && (
              <p className={s.eventSelection}>
                {mode === "attended" ? "Attended" : "Conducted"} · {eventType}
              </p>
            )}
          </div>

          {step === 1 && (
            <div className={s.stepCardBody}>
              <fieldset className={s.modeFieldset}>
                <legend className={s.fieldLabel}>Event mode</legend>
                <div className={s.choiceGrid}>
                  {EVENT_MODES.map((option) => (
                    <label className={s.modeChoice} key={option.value}>
                      <input type="radio" name="event-mode" value={option.value} checked={mode === option.value} onChange={() => chooseMode(option.value)} required />
                      <span><strong>{option.label}</strong><small>{option.description}</small></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className={s.formGroup}>
                <label className={s.fieldLabel} htmlFor="event-type">Event type</label>
                <select id="event-type" className={s.fieldSelect} value={data.eventType} onChange={(event) => setField("eventType", event.target.value)} required>
                  <option value="">Select an event type</option>
                  {EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </div>
              {data.eventType === "Other" && (
                <label className={s.formGroup}>
                  <span className={s.fieldLabel}>Specify event type <span className={s.required}>*</span></span>
                  <input
                    type="text"
                    className={s.fieldInput}
                    value={data.customEventType}
                    onChange={(event) => setField("customEventType", event.target.value)}
                    placeholder="e.g. Panel discussion"
                    required
                  />
                </label>
              )}
            </div>
          )}
          {step===2 && <Step1 data={data} set={setField}/>}
          {step===3 && mode && <Step2 data={data} set={setField} mode={mode}/>}
          {step===4 && mode && <Step3 data={data} set={setField} mode={mode}/>}
          {step===5 && <Step4 data={data} set={setField}/>}
          {step===lastStep && mode && <Step6 data={data} mode={mode} goTo={goTo}/>}
        </div>
      </div>

      {saveError && <p className={s.saveError} role="alert">{saveError}</p>}

      {/* Bottom Navigation */}
      <div className={s.bottomNav}>
        <div className={s.bottomRight}>
          <button type="button" className={s.navBackBtn}
            disabled={step===1} onClick={()=>goTo(step - 1)}>
            <Ico.Back/> Back
          </button>
          {step < lastStep ? (
            <button id="continue-btn" type="button" className={s.navContinueBtn}
              disabled={step >= availableStep} onClick={()=>goTo(step + 1)}>
              Continue <Ico.Arrow/>
            </button>
          ) : (
            <button id="submit-btn" type="button" className={s.navSubmitBtn}
              disabled={saving} onClick={() => void saveEvent()}>
              <Ico.Submit/> {saving ? "Saving…" : "Save event"}
            </button>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {submitted && (
        <div className={s.successOverlay}>
          <div className={s.successCard}>
            <div className={s.successIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className={s.successTitle}>Event saved</div>
            <p className={s.successSub}>
              Your event <strong>&quot;{data.eventName || "record"}&quot;</strong> is available in My Events.
            </p>
            <div className={s.successBtns}>
              <button className={s.addAnotherBtn} onClick={()=>{setSubmitted(false);setMode(null);setData(INITIAL);goTo(1);setFurthestStep(1);}}>
                Add Another
              </button>
              <button className={s.navContinueBtn} onClick={()=>router.push("/events")}>
                View My Events <Ico.Arrow/>
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
