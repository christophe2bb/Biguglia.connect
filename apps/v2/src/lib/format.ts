export function formatPrice(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}
export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        // A calendar date has no time zone: keep its day when travelling.
        timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : undefined,
      }).format(date);
}
