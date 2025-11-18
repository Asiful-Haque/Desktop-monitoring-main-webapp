// src/app/lib/payment-buckets.js
const DEFAULT_TZ = "Asia/Dhaka";

function keyOfDate(d, timeZone = DEFAULT_TZ) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d || "");
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dt); // 2025-11-12
}

function currentMonthKey(timeZone = DEFAULT_TZ, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).format(now); // 2025-11
}

function bucketForDay(dayNum) {
  if (dayNum <= 7) return "1-7";
  if (dayNum <= 15) return "8-15";
  if (dayNum <= 23) return "16-23";
  return "24-31";
}

function ensureDev(out, devId) {
  console.log("+++++++++++++++++++++++++++++++++Ensuring developer bucket exists for devId:", devId);
  const k = String(devId);
  if (!out[k]) out[k] = { "1-7": [], "8-15": [], "16-23": [], "24-31": [] };
}

function hmsLabel(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

/**
 * INPUT day rows from page.js:
 *  { date, hours, label,
 *    serial_ids[], session_payments[], flaggers[], user_id[],
 *    session_seconds[], session_seconds_label[] }
 *   console.log("...");
  console.log("...")
  console.log("...")
  console.log("...")
 *
 * OUTPUT grouped by developer → bucket (1-7, 8-15, 16-23, 24-31)
 * One **aggregated item per developer-day** (arrays merged; payment & seconds summed).
 */
// export function groupCurrentMonthForPayment(data, timeZone = DEFAULT_TZ, now = new Date()) {
//   console.log("Grouping data function for payment buckets...",data);

//   const monthKey = currentMonthKey(timeZone, now);
//   const out = { month: monthKey };

//   // console.log("Data passed to grouping function:", data);  

//   if (!Array.isArray(data) || data.length === 0) {
//     console.log("No data to process----");
//     return out;
//   }

//   const devSeen = new Set();
//   console.log("Seeding developers that appear in the month...");

//   for (const row of data) {
//     const dayKey = keyOfDate(row?.date, timeZone);
//     console.log("Processing row with dayKey:", dayKey);

//     if (!dayKey || !dayKey.startsWith(monthKey)) continue;

//     const uids = Array.isArray(row?.user_id) ? row.user_id : [];
//     console.log("User IDs in this row:", uids);

//     uids.forEach((u) => u != null && devSeen.add(u)); // Add developers to the Set
//   }

//   devSeen.forEach((devId) => ensureDev(out, devId)); // Ensure developer buckets

//   const acc = {};  // Using an object instead of Map
//   console.log("Starting to aggregate data...11");

//   for (const row of data) {
//     const dayKey = keyOfDate(row?.date, timeZone);
//     // console.log("Processing row with dayKey:", dayKey);

//     if (!dayKey || !dayKey.startsWith(monthKey)) continue;

//     const dayNum = Number(dayKey.split("-")[2]);
//     if (!Number.isFinite(dayNum)) continue;

//     const bucket = bucketForDay(dayNum);

//     const serials = Array.isArray(row?.serial_ids) ? row.serial_ids : [];
//     const pays = Array.isArray(row?.session_payments) ? row.session_payments : [];
//     const flags = Array.isArray(row?.flaggers) ? row.flaggers : [];
//     const uids = Array.isArray(row?.user_id) ? row.user_id : [];
//     const secs = Array.isArray(row?.session_seconds) ? row.session_seconds : [];

//     const L = Math.max(serials.length, pays.length, flags.length, uids.length, secs.length);

//     for (let i = 0; i < L; i++) {
//       const flag = Number(flags[i] ?? 1);
//       if (flag !== 0) continue; // only payable

//       const devId = uids[i];
//       if (devId == null) continue;

//       ensureDev(out, devId); // Ensure dev bucket exists

//       const k = `${devId}|${bucket}|${dayKey}`;
//       if (!acc[k]) {  // Using the object to store the aggregated data
//         acc[k] = {
//           devId,
//           bucket,
//           date: dayKey,
//           totalSecs: 0,
//           totalPayment: 0,
//           serial_ids: [],
//           session_payments: [],
//           flaggers: [],
//           user_id: [],
//         };
//       }
//       const a = acc[k];

//       const s = Number(secs[i] || 0);
//       const p = Number(pays[i] || 0);

//       // Merge the session data
//       if (serials[i] != null) a.serial_ids.push(serials[i]);
//       a.session_payments.push(p);
//       a.flaggers.push(0);
//       a.user_id.push(devId);

//       a.totalSecs += s;
//       a.totalPayment += p;
//     }
//   }

//   console.log("Aggregated data:", acc);

//   // Flush the aggregates to output buckets
//   for (const k in acc) {
//     const a = acc[k];
//     const item = {
//       date: a.date,
//       hours: a.totalSecs / 3600,
//       label: hmsLabel(a.totalSecs),
//       serial_ids: a.serial_ids,
//       session_payments: a.session_payments,
//       flaggers: a.flaggers,
//       user_id: a.user_id,
//       payment: a.totalPayment,
//     };
//     console.log("Item to be pushed to output:", item);
//     out[String(a.devId)][a.bucket].push(item);  // Ensure the data is pushed into the correct bucket
//   }

//   console.log("Returning grouped payment buckets:", out);
//   return out;
// }
export function groupCurrentMonthForPayment(data, timeZone = DEFAULT_TZ, now = new Date()) {
  try {
    console.log("Grouping data function for payment buckets...", data);

    const monthKey = currentMonthKey(timeZone, now);
    const out = { month: monthKey };

    if (!Array.isArray(data) || data.length === 0) {
      console.log("No data to process----");
      return out;
    }

    const devSeen = new Set();
    console.log("Seeding developers that appear in the month...");

    for (const row of data) {
      const dayKey = keyOfDate(row?.date, timeZone);
      console.log("Processing row with dayKey:", dayKey);

      if (!dayKey || !dayKey.startsWith(monthKey)) continue;

      const uids = Array.isArray(row?.user_id) ? row.user_id : [];
      console.log("User IDs in this row:", uids);

      uids.forEach((u) => u != null && devSeen.add(u)); // Add developers to the Set
    }

    devSeen.forEach((devId) => ensureDev(out, devId)); // Ensure developer buckets

    const acc = {};  // Using an object instead of Map
    console.log("Starting to aggregate data...11");

    for (const row of data) {
      const dayKey = keyOfDate(row?.date, timeZone);
      if (!dayKey || !dayKey.startsWith(monthKey)) continue;

      const dayNum = Number(dayKey.split("-")[2]);
      if (!Number.isFinite(dayNum)) continue;

      const bucket = bucketForDay(dayNum);

      const serials = Array.isArray(row?.serial_ids) ? row.serial_ids : [];
      const pays = Array.isArray(row?.session_payments) ? row.session_payments : [];
      const flags = Array.isArray(row?.flaggers) ? row.flaggers : [];
      const uids = Array.isArray(row?.user_id) ? row.user_id : [];
      const secs = Array.isArray(row?.session_seconds) ? row.session_seconds : [];
      const tenantIds = Array.isArray(row?.tenant_ids) ? row.tenant_ids : [];

      const L = Math.max(serials.length, pays.length, flags.length, uids.length, secs.length);

      for (let i = 0; i < L; i++) {
        const flag = Number(flags[i] ?? 1);
        if (flag !== 0) continue; // only payable

        const devId = uids[i];
        if (devId == null) continue;

        ensureDev(out, devId); // Ensure dev bucket exists

        const k = `${devId}|${bucket}|${dayKey}`;
        if (!acc[k]) {  // Using the object to store the aggregated data
          acc[k] = {
            devId,
            bucket,
            date: dayKey,
            totalSecs: 0,
            totalPayment: 0,
            serial_ids: [],
            session_payments: [],
            flaggers: [],
            user_id: [],
            tenant_ids: [], // Added tenant_ids to the accumulator
          };
        }
        const a = acc[k];

        const s = Number(secs[i] || 0);
        const p = Number(pays[i] || 0);

        // Merge the session data
        if (serials[i] != null) a.serial_ids.push(serials[i]);
        a.session_payments.push(p);
        a.flaggers.push(0);
        a.user_id.push(devId);

        a.totalSecs += s;
        a.totalPayment += p;

        // Ensure tenant_id is added (assuming all tenant_ids are the same for a given row)
        tenantIds.forEach((tenantId) => {
          if (!a.tenant_ids.includes(tenantId)) {
            a.tenant_ids.push(tenantId);  // Add tenant_id if not already added
          }
        });
      }
    }

    console.log("Aggregated data:", acc);

    // Flush the aggregates to output buckets
    for (const k in acc) {
      const a = acc[k];
      const item = {
        date: a.date,
        hours: a.totalSecs / 3600,
        label: hmsLabel(a.totalSecs),
        serial_ids: a.serial_ids,
        session_payments: a.session_payments,
        flaggers: a.flaggers,
        user_id: a.user_id,
        payment: a.totalPayment,
        tenant_ids: a.tenant_ids, // Ensure tenant_ids is included in the final output
      };
      console.log("Item to be pushed to output:", item);
      out[String(a.devId)][a.bucket].push(item);  // Ensure the data is pushed into the correct bucket
    }

    console.log("Returning grouped payment buckets:", out);
    return out;

  } catch (error) {
    // Log and handle any error that occurs
    console.error("Error in groupCurrentMonthForPayment:", error);
    throw new Error("Error processing the payment grouping.");
  }
}



 
export function debugLogPaymentBuckets(grouped) {
  try {
    console.groupCollapsed(
      "%cCurrent Month Payment Buckets (by Developer)",
      "background:#4f46e5;color:#fff;padding:2px 6px;border-radius:4px;"
    );
    // console.log(JSON.stringify(grouped, null, 2));
    console.log(grouped);
    console.groupEnd();
  } catch {}
}
