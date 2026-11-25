import styles from "./admin.module.css";

export default function AdminLoading() {
  return <div className={styles.loading} role="status"><span className={styles.skeleton} />Loading administration…</div>;
}
