import { useEffect, useId, useRef } from "react";
import { eventCertificateUrl, eventDateFormat, SDG_LIST, type FacultyEvent } from "@/lib/facultyEvents";
import styles from "./events.module.css";

function DetailSection({
  title,
  fields,
  stacked = false,
}: {
  title: string;
  fields: [string, string | undefined][];
  stacked?: boolean;
}) {
  const visibleFields = fields.filter(([, value]) => value?.trim());
  if (!visibleFields.length) return null;

  return (
    <section className={styles.detailSection}>
      <h3>{title}</h3>
      <dl className={stacked ? styles.detailStack : styles.detailGrid}>
        {visibleFields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const formatLabels = { offline: "In person", online: "Online", hybrid: "Hybrid" };

export default function EventDetailsDialog({ event, onClose }: { event: FacultyEvent; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const details = event.details;
  const conducted = event.mode === "conducted";
  const roleFields: [string, string | undefined][] = conducted ? [
    ["Organizing responsibility", details?.organizingResponsibility],
    ["Chief guest", details?.chiefGuest],
    ["Number of participants", details?.numParticipants],
    ["Target audience", details?.targetAudience],
    ["Coordinators", details?.coordinators],
  ] : [
    ["Participation type", details?.participationType],
  ];
  const time = [details?.startTime, details?.endTime].filter(Boolean).join(" – ");
  const goals = details?.sdgs?.map((number) => {
    const goal = SDG_LIST.find(({ n }) => n === number);
    return goal ? `${number}. ${goal.name}` : `SDG ${number}`;
  });

  return (
    <dialog ref={dialogRef} className={`${styles.modal} ${styles.eventDialog}`} aria-labelledby={titleId} onClose={onClose}>
      <header className={styles.modalHeader}>
        <div>
          <p className={styles.eventMode}>{conducted ? "Conducted event" : "Attended event"}</p>
          <h2 id={titleId} className={styles.modalTitle}>{event.name}</h2>
        </div>
        <button type="button" className={styles.modalClose} aria-label="Close event details" onClick={() => dialogRef.current?.close()}>
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className={styles.modalBody}>
        <DetailSection title="Overview" fields={[
          ["Category", event.category],
          ["Date", eventDateFormat.format(new Date(event.eventDate))],
          ["Time", time],
          ["Format", details?.format && formatLabels[details.format]],
          ["Organizer", details?.organizer],
          ["Department", details?.department],
          ["Venue", details?.venue],
        ]} />
        <DetailSection title={conducted ? "Organization" : "Participation"} fields={[
          ["Faculty role", event.facultyRole],
          ...roleFields,
        ]} />
        <DetailSection title="Event summary" stacked fields={[
          ["Description", details?.description],
          ["Objectives", details?.objectives],
          ["Key topics", details?.keyTopics],
          ["Outcome", details?.eventOutcome],
        ]} />
        <DetailSection title="SDGs and focus areas" stacked fields={[
          ["Sustainable Development Goals", goals?.join("\n")],
          ["Institutional focus areas", details?.focusAreas?.join("\n")],
        ]} />
        {event.certificate && (
          <section className={styles.detailSection}>
            <h3>Certificate</h3>
            <p className={styles.certificateName}>{event.certificate.fileName}</p>
            <a className={styles.certificateDownload} href={eventCertificateUrl(event.id)}>Download certificate</a>
          </section>
        )}
      </div>
    </dialog>
  );
}
