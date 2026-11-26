import { useEffect, useId, useRef, useState } from "react";
import styles from "./page.module.css";

export default function DocumentPreview({ name, title, student, url, onClose }: {
  name: string; title: string; student: string; url: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [preview, setPreview] = useState<{ url: string; type: string } | "error" | "unsupported">();

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    fetch(url, { credentials: "include", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      if (!["application/pdf", "image/png", "image/jpeg"].includes(blob.type)) {
        setPreview("unsupported");
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setPreview({ url: objectUrl, type: blob.type });
    }).catch(() => {
      if (!controller.signal.aborted) setPreview("error");
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return (
    <dialog ref={dialog} aria-labelledby={headingId} onClose={onClose} className={styles.dialog}>
      <header className={styles.dialogHeader}>
        <div><h2 id={headingId}>{name}</h2><p>{title} · {student}</p></div>
        <button type="button" className={styles.button} onClick={() => dialog.current?.close()}>Close</button>
      </header>
      <div className={styles.previewBody}>
        {preview === "error" ? <p role="alert">The preview could not be loaded. Try downloading the file.</p>
          : preview === "unsupported" ? <p>This file format does not support preview.</p>
          : !preview ? <p role="status">Loading preview…</p>
          : preview.type === "application/pdf" ? <iframe className={styles.pdf} src={preview.url} title={`Preview of ${name}`} />
          // eslint-disable-next-line @next/next/no-img-element -- Protected files are displayed using a browser Blob URL.
          : <img className={styles.image} src={preview.url} alt={name} />}
      </div>
      <footer className={styles.dialogFooter}><a className={styles.button} href={url}>Download file</a></footer>
    </dialog>
  );
}
