/** Checks the editor's date-time conversion, the cause of wrong event times.
 *
 * Two bugs lived in plugins/date.ts: `HH:MM` wrote the MONTH into the minutes,
 * and conversion used the browser's timezone while the server stored the text
 * as UTC. The fixed behaviour must not depend on where the editor is, so run it
 * under several process timezones and expect identical output:
 *
 *   TZ=Asia/Shanghai    npx tsx ./scripts/check_event_datetime.ts
 *   TZ=UTC              npx tsx ./scripts/check_event_datetime.ts
 *   TZ=America/New_York npx tsx ./scripts/check_event_datetime.ts
 */
import moment from "moment";
import { getDate, toStoredDate, CONTENT_UTC_OFFSET_MINUTES } from "../plugins/date";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${ok ? "" : `\n         expected ${JSON.stringify(expected)}\n         actual   ${JSON.stringify(actual)}`}`);
}

console.log(`\nprocess timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}  (content offset: UTC+${CONTENT_UTC_OFFSET_MINUTES / 60})`);

console.log("\n--- the reported bug: minutes must be minutes, never the month ---");
// 10:45 in Armenia on 3 July is 06:45 UTC.
check("July event keeps its minutes", getDate("2026-07-03T06:45:00.000Z"), "2026-07-03T10:45");
check("November event keeps its minutes", getDate("2025-11-15T06:45:00.000Z"), "2025-11-15T10:45");
check("the old format really was wrong", moment.utc("2026-07-03T06:45:00.000Z").format("YYYY-MM-DDTHH:MM").endsWith(":07"), true);
let monthLeaks = 0;
for (let month = 1; month <= 12; month++) {
  const mm = String(month).padStart(2, "0");
  if (!getDate(`2026-${mm}-10T06:33:00.000Z`).endsWith(":33")) monthLeaks++;
}
check("no month leaks into minutes across all 12 months", monthLeaks, 0);

console.log("\n--- saving: typed Armenia time -> the right UTC instant ---");
check("09:30 in Armenia is 05:30 UTC", toStoredDate("2026-07-03T09:30"), "2026-07-03T05:30:00.000Z");
check("00:15 rolls back to the previous UTC day", toStoredDate("2026-07-03T00:15"), "2026-07-02T20:15:00.000Z");
check("23:59 stays on the same UTC day", toStoredDate("2026-07-03T23:59"), "2026-07-03T19:59:00.000Z");
check("seconds from the input are tolerated", toStoredDate("2026-07-03T09:30:00"), "2026-07-03T05:30:00.000Z");
check("empty stays empty", toStoredDate(""), "");
check("unparseable is left for the input to flag", toStoredDate("not a date"), "not a date");

console.log("\n--- round trip: what you type is what you get back ---");
let roundTripMisses = 0;
for (let month = 1; month <= 12; month++) {
  for (const hh of ["00", "07", "12", "19", "23"]) {
    for (const minute of ["00", "01", "07", "15", "30", "45", "59"]) {
      const typed = `2026-${String(month).padStart(2, "0")}-${month === 2 ? "28" : "30"}T${hh}:${minute}`;
      if (getDate(toStoredDate(typed)) !== typed) roundTripMisses++;
    }
  }
}
check("420 typed values survive save -> reload unchanged", roundTripMisses, 0);

console.log("\n--- display of values already stored ---");
check("a Date object is handled", getDate(new Date("2026-07-03T06:45:00.000Z")), "2026-07-03T10:45");
check("empty, null and undefined show blank", [getDate(""), getDate(null), getDate(undefined)], ["", "", ""]);
check("garbage shows blank rather than 'Invalid date'", getDate("garbage"), "");

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
