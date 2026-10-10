import { STATUSES, type StatusId } from "../lib/types";

export function StatusBadge({ status }: { status: StatusId }) {
  const label = STATUSES.find((s) => s.id === status)?.label ?? status;
  return <span className={`badge badge-${status}`}>{label}</span>;
}
