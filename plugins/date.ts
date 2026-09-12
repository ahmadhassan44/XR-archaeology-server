import moment from "moment";

/** Offset used for every date-time the editor reads or writes, in minutes.
 *
 * All the content in this CMS is about places around Vedi, so a date-time means
 * the wall-clock time *in Armenia* - "the festival starts at 10:00" means 10:00
 * at the venue, whoever is typing it and wherever the visitor's phone is set.
 * Armenia has been UTC+4 all year round since it abolished daylight saving in
 * 2012, so a fixed offset is exact. The mobile app pins to the same offset.
 */
export const CONTENT_UTC_OFFSET_MINUTES = 4 * 60;

/** Human label for the offset, shown next to date-time inputs. */
export const CONTENT_TIMEZONE_LABEL = "Armenia time (UTC+4)";

/** Stored value -> the `YYYY-MM-DDTHH:mm` string a `datetime-local` input expects.
 *
 * Two bugs used to live here:
 *
 * 1. The format was `YYYY-MM-DDTHH:MM`. The second `MM` is the MONTH, not the
 *    minutes (`mm`), so opening a July event pre-filled its time as `hh:07`, and
 *    saving after touching the field wrote the month into the minutes.
 * 2. It formatted in the *browser's* timezone, while the value it produced was
 *    sent back without an offset and the server (running in UTC) stored it as
 *    UTC. For an editor on UTC+8 every save shifted the time by 8 hours.
 */
export function getDate(val: any) {
  if (val === null || val === undefined || val === "") return "";
  const m = moment.utc(val);
  if (!m.isValid()) return "";
  return m.utcOffset(CONTENT_UTC_OFFSET_MINUTES).format("YYYY-MM-DDTHH:mm");
}

/** `datetime-local` input string -> an unambiguous ISO instant for the server.
 *
 * The input yields local wall-clock text with no offset (`2026-07-03T09:30`).
 * Reads it as Armenia time and returns UTC ISO (`2026-07-03T05:30:00.000Z`), so
 * the server stores the instant that was meant instead of guessing a timezone.
 * Returns the input unchanged if it is empty or unparseable, leaving validation
 * to the input itself.
 */
export function toStoredDate(value: string) {
  if (!value) return value;
  const m = moment.utc(value, ["YYYY-MM-DDTHH:mm", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD"], true);
  if (!m.isValid()) return value;
  // The text is Armenia wall-clock time: step back by the offset to reach UTC.
  return m.subtract(CONTENT_UTC_OFFSET_MINUTES, "minutes").toISOString();
}
