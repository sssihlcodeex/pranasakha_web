import "./StatusBadge.css";
const MAP = {
  pending: ["Pending review", "pending"],
  approved: ["Approved", "approved"],
  info_requested: ["Needs information", "info"],
  declined: ["Declined", "declined"],
  confirmed: ["Confirmed", "approved"],
  issued: ["Issued", "approved"],
};
export function StatusBadge({ status = "pending" }) {
  const [label, tone] = MAP[status] ?? [status, "neutral"];
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}
