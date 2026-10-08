export const CATEGORY_LABELS: Record<string, string> = {
  order: "An order",
  payment: "Payment or wallet",
  ride: "A ride or delivery",
  technician: "A technician job",
  app: "The app is not working",
  account: "My account",
  other: "Something else",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "We're on it",
  fixed: "Fixed",
};

export const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  in_progress: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  fixed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};