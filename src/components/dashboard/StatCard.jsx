import "./StatCard.css";
export function StatCard({ icon: Icon, label, value, hint, tone = "blue" }) {
  return <article className="stat-card"><div className={`stat-card__icon stat-card__icon--${tone}`}><Icon size={19} /></div><div className="stat-card__body"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div></article>;
}
