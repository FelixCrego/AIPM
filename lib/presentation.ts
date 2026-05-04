import { formatDistanceToNow } from "date-fns";

export const formatRelative = (value: Date | string | null | undefined) => {
  if (!value) {
    return "N/A";
  }
  const date = value instanceof Date ? value : new Date(value);
  return `${formatDistanceToNow(date, { addSuffix: true })}`;
};

export const toPercent = (value: number | null | undefined) => {
  if (value == null) {
    return "N/A";
  }
  return `${Math.round(value * 100)}%`;
};
