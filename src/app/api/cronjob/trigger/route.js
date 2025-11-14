// import { NextResponse } from "next/server"; // Use NextResponse for Next.js 13
// import { fetchDataForCronJob } from "@/app/lib/crondatabasedata"; // Import function to fetch data
// import { submitSinglePayment, submitAllVisiblePayments } from "@/app/lib/PaymentCommonApi"; // Import payment functions
// import { corsEmpty, corsJson } from "@/app/lib/coreResponse";

// function currentMonthKey(timeZone = "Asia/Dhaka", now = new Date()) {
//   return new Intl.DateTimeFormat("en-CA", {
//     timeZone,
//     year: "numeric",
//     month: "2-digit",
//   }).format(now); // Example: 2025-11
// }

// function keyOfDate(d, timeZone = "Asia/Dhaka") {
//   const dt = d instanceof Date ? d : new Date(d);
//   if (Number.isNaN(dt.getTime())) return String(d || "");
//   return new Intl.DateTimeFormat("en-CA", {
//     timeZone,
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//   }).format(dt); // 2025-11-12 (for example)
// }

// // export async function POST(req) {
// //   console.log("Cron job /api/cronjob/trigger called");

// //   try {
// //     console.log("Cron job triggered: Processing functions -------------------");

// //     // Step 1: Fetch data from your database (replicating frontend fetch)
// //     const data = await fetchDataForCronJob();
// //     console.log("Data fetched for payroll processing, number of items:", data.length);
// //     console.log("Sample data item:", data[0]);

// //     if (!data || data.length === 0) {
// //       return NextResponse.json({ message: "No data available for payroll" }, { status: 400 });
// //     }

// //     // Step 2: Process the data to group it by developer for payments
// //     console.log("Grouping data for payment processing...1");

// //     const monthKey = currentMonthKey("Asia/Dhaka", new Date()); // Set your timezone
// //     const out = { month: monthKey };

// //     if (!Array.isArray(data) || data.length === 0) {
// //       console.log("No data to process");
// //       return NextResponse.json({ message: "No valid grouped data available" }, { status: 400 });
// //     }
// // console.log("Grouping data for payment processing...2", data[0]);
// //     const devSeen = new Set();
// //     console.log("Seeding developers that appear in the month...");

// //     // Seeding developers%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
// //     for (const row of data) {
// //       const dayKey = keyOfDate(row?.date, "Asia/Dhaka");
// //     //   console.log("---row---", row);
// //       console.log("Processing row with dayKey:", dayKey);
// //       if (!dayKey || !dayKey.startsWith(monthKey)) continue;

// //       const uids = Array.isArray(row?.user_id) ? row.user_id : [];
// //       uids.forEach((u) => u != null && devSeen.add(u)); // Add developers to the Set
// //     }

// //     // Ensure each developer has a bucket (1-7, 8-15, etc.)
// //     devSeen.forEach((devId) => ensureDev(out, devId)); 

// //     const acc = {}; // Using an object instead of Map
// //     console.log("Starting to aggregate data...");

// //     // Aggregating data
// //     for (const row of data) {
// //       const dayKey = keyOfDate(row?.date, "Asia/Dhaka");
// //       if (!dayKey || !dayKey.startsWith(monthKey)) continue;

// //       const dayNum = Number(dayKey.split("-")[2]);
// //       if (!Number.isFinite(dayNum)) continue;

// //       const bucket = bucketForDay(dayNum);

// //       const serials = Array.isArray(row?.serial_ids) ? row.serial_ids : [];
// //       const pays = Array.isArray(row?.session_payments) ? row.session_payments : [];
// //       const flags = Array.isArray(row?.flaggers) ? row.flaggers : [];
// //       const uids = Array.isArray(row?.user_id) ? row.user_id : [];
// //       const secs = Array.isArray(row?.session_seconds) ? row.session_seconds : [];

// //       const L = Math.max(serials.length, pays.length, flags.length, uids.length, secs.length);

// //       for (let i = 0; i < L; i++) {
// //         const flag = Number(flags[i] ?? 1);
// //         if (flag !== 0) continue; // only payable

// //         const devId = uids[i];
// //         if (devId == null) continue;

// //         ensureDev(out, devId); // Ensure dev bucket exists

// //         const k = `${devId}|${bucket}|${dayKey}`;
// //         if (!acc[k]) { 
// //           acc[k] = {
// //             devId,
// //             bucket,
// //             date: dayKey,
// //             totalSecs: 0,
// //             totalPayment: 0,
// //             serial_ids: [],
// //             session_payments: [],
// //             flaggers: [],
// //             user_id: [],
// //           };
// //         }
// //         const a = acc[k];

// //         const s = Number(secs[i] || 0);
// //         const p = Number(pays[i] || 0);

// //         // Merge the session data
// //         if (serials[i] != null) a.serial_ids.push(serials[i]);
// //         a.session_payments.push(p);
// //         a.flaggers.push(0);
// //         a.user_id.push(devId);

// //         a.totalSecs += s;
// //         a.totalPayment += p;
// //       }
// //     }

// //     console.log("Aggregated data:", acc);

// //     // Flush the aggregates to output buckets
// //     for (const k in acc) {
// //       const a = acc[k];
// //       const item = {
// //         date: a.date,
// //         hours: a.totalSecs / 3600,
// //         label: hmsLabel(a.totalSecs),
// //         serial_ids: a.serial_ids,
// //         session_payments: a.session_payments,
// //         flaggers: a.flaggers,
// //         user_id: a.user_id,
// //         payment: a.totalPayment,
// //       };
// //       console.log("Item to be pushed to output:", item);
// //       out[String(a.devId)][a.bucket].push(item);  // Ensure the data is pushed into the correct bucket
// //     }

// //     console.log("Returning grouped payment buckets:", out);

// //     // Step 3: Loop through the developers and process their payments
// //     const paymentResults = [];
// //     console.log("Processing payments for grouped developers... with grouped data:", out);

// //     for (const devId in out) {
// //       if (devId === "month") continue; // Skip the "month" key

// //       const devData = out[devId];

// //       // Skip if the role is freelancer
// //       const roleLower = String(devData.role).toLowerCase();
// //       if (roleLower === "freelancer") {
// //         console.info(`Skipping bulk payment for freelancer userId=${devId}`);
// //         continue;
// //       }

// //       console.log(`Processing payments for developer userId=${devId}`);
// //       const rowsForDev = buildRowsForDeveloper(out, devId);
// //       console.log("Rows for developer", devId, rowsForDev);

// //       // Process each row (payment) for the developer
// //       for (const row of rowsForDev) {
// //         await submitSinglePayment({
// //           id: row.id,
// //           date: row.date,
// //           rows: rowsForDev,
// //           setRows: () => rowsForDev, // Assuming no UI state updates needed
// //           processed: {},
// //           setProcessed: () => {},
// //           currentUser: req.user, // Assuming you have user info from JWT or middleware
// //           developerId: Number(devId),
// //         });

// //         paymentResults.push({ success: true, devId, row });
// //       }
// //     }

// //     // Step 4: Respond with success message and results
// //     console.log("Payroll processing complete. Returning success.");
// //     return NextResponse.json({ message: "Payroll processed successfully", paymentResults });

// //   } catch (error) {
// //     console.error("Error processing payroll:", error);
// //     return NextResponse.json({ message: "Error processing payroll", error: error.message }, { status: 500 });
// //   }
// // }


// export async function POST(req) {
//   console.log("Cron job /api/cronjob/trigger called");

//   try {
//     console.log("Cron job triggered: Processing functions -------------------");

//     // Step 1: Fetch data from your database (replicating frontend fetch)
//     const data = await fetchDataForCronJob();
//     console.log("Data fetched for payroll processing, number of items:", data.length);
//     console.log("Sample data item:", data[0]);

//     if (!data || data.length === 0) {
//       return NextResponse.json({ message: "No data available for payroll" }, { status: 400 });
//     }

//     NextResponse.json({ message: "Payroll processed successfully" });
//         return corsJson(
//           { message: "data needed successfully", data },
//           201
//         );
//   } catch (error) {
//     console.error("Error processing payroll:", error);
//     return NextResponse.json({ message: "Error processing payroll", error: error.message }, { status: 500 });
//   }
// }




import { NextResponse } from "next/server"; // Import NextResponse for Next.js 13
import { fetchDataForCronJob } from "@/app/lib/crondatabasedata"; 
import { groupCurrentMonthForPayment } from "@/app/lib/payment-buckets";
import { submitSinglePayment } from "@/app/lib/PaymentCommonApi";
import { getAuthFromCookie } from "@/app/lib/auth-server";

// Helper function to parse ISO date
function parseISO(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const TZ = "Asia/Dhaka";

// Helper function to format date in a specific timezone
function keyInTZ(d, timeZone = TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Helper function to compute seconds from start and end time
function computeSeconds(row) {
  const start = parseISO(row?.task_start);
  const end = parseISO(row?.task_end);
  if (start && end && end > start) {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }
  if (typeof row?.duration === "number" && !Number.isNaN(row.duration)) {
    const d = row.duration;
    if (d >= 3600000) return Math.floor(d / 1000); // ms
    if (d >= 3600) return Math.floor(d);           // seconds
    if (d >= 60) return Math.floor(d * 60);        // minutes
    return Math.floor(d * 60);
  }
  return 0;
}

// Helper function to format date
function fmtLocal(dt, timeZone = TZ) {
  if (!(dt instanceof Date)) return "-";
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return f.format(dt); // dd/mm/yyyy, hh:mm:ss
}

// Helper function to convert seconds into hours, minutes, seconds format
function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

export async function POST(req) {
  console.log("Starting call to /api/cronjob/trigger...");

  try {

    const cookieHeader = req.headers.get("cookie");
    const token = cookieHeader
        .split("; ")
        .find(c => c.startsWith("token="))
        ?.split("=")[1];
        console.log("____",token);

    // Fetch the data using fetchDataForCronJob
    const data = await fetchDataForCronJob(token);
    if (!data || data.length === 0) {
      throw new Error("No data fetched for payroll process");
    }

    const daySessions = new Map();
    const rolesByUserId = new Map(); // Mapping user_id to role

    // Process data and store roles for each user
    for (const row of data) {
      const startDt = parseISO(row?.task_start);
      const endDt = parseISO(row?.task_end);
      const anchor = startDt || endDt || parseISO(row?.work_date);
      if (!anchor) continue;

      const dayKey = keyInTZ(anchor, TZ);
      const secs = computeSeconds(row);
      const leftText = startDt && endDt
        ? `${fmtLocal(startDt, TZ)} → ${fmtLocal(endDt, TZ)}`
        : startDt
        ? `${fmtLocal(startDt, TZ)} → —`
        : endDt
        ? `— → ${fmtLocal(endDt, TZ)}`
        : `duration only (#${row?.serial_id ?? row?.task_id ?? "?"})`;

        

      const item = {
        serial_id: row?.serial_id ?? null,
        seconds: secs,
        startISO: startDt ? startDt.toISOString() : null,
        endISO: endDt ? endDt.toISOString() : null,
        line: leftText,
        task_id: row?.task_id ?? null,
        project_id: row?.project_id ?? null,
        task_name: row?.task_name ?? null,
        user_id: row?.dev_user_id ?? row?.developer_id,  // Ensuring user_id is taken from proper field
        session_payment: row?.session_payment ?? 0,  // Ensure session_payment is assigned
        flagger: row?.flagger ?? 0,  // Ensure flagger is assigned, default to 0
      };

      // Store the role of the user in the rolesByUserId map
      const item_user_id = item.user_id; 
      const item_role = String(row?.role ?? row?.developer_role ?? "").trim().toLowerCase();

      
      if (Number.isFinite(item_user_id) && item_role) {
        rolesByUserId.set(item_user_id, item_role); // Save role for the user
      }

      const list = daySessions.get(dayKey) || [];
      list.push(item);
      daySessions.set(dayKey, list);
    }

    // Process session data
    const desiredData = processSessions(daySessions);

    // Process payments after grouping
    const { month, ...rest } = groupCurrentMonthForPayment(desiredData);
    const devIds = Object.keys(rest).filter((k) => k !== "month");

    // Loop through all developers and process their payments
    for (const devId of devIds) {
      const devBuckets = rest[devId];
      if (!devBuckets) continue;

      console.groupCollapsed(`PAY RUN → Developer ${devId}`);

      const rowsForDev = buildRowsForDeveloper(rest, devId);
      let processedMap = {};
      let rowsBag = [...rowsForDev];

      for (const row of rowsForDev) {
        console.log("Row to be processed:", row);
        await submitSinglePayment({
          id: row.id,
          date: row.date,
          rows: rowsBag,
          setRows: (fn) => {
            rowsBag = typeof fn === "function" ? fn(rowsBag) : fn;
          },
          processed: processedMap,
          setProcessed: (fn) => {
            processedMap = typeof fn === "function" ? fn(processedMap) : fn;
          },
          currentUser: devId,  // Replace with actual user handling logic
          developerId: Number(devId),
          token: token,
        });
      }

      console.groupEnd();
    }

    // Respond with success
    return NextResponse.json({ success: true, data: desiredData });
  } catch (error) {
    console.error("Error triggering payroll process:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Function to process sessions based on your data
function processSessions(sessions) {
  const detailsByDate = {};
  const desiredData = Array.from(sessions.entries())
    .map(([date, sessions]) => {
      detailsByDate[date] = sessions;

      const totalSecs = sessions.reduce((acc, s) => acc + s.seconds, 0);
      const hours = Math.round((totalSecs / 3600) * 100) / 100;

      const serial_ids = Array.from(
        new Set(
          sessions
            .map((s) => s.serial_id)
            .filter((x) => x !== null && x !== undefined && x !== "")
        )
      );
      const session_payments = sessions.map((s) => s.session_payment);
      const flaggers = sessions.map((s) => s.flagger);
      const user_id = sessions.map((s) => s.user_id);

      const session_seconds = sessions.map((s) => Number(s.seconds) || 0);
      const session_seconds_label = sessions.map((s) =>
        formatHMS(Number(s.seconds) || 0)
      );

      return {
        date,
        hours,
        label: formatHMS(totalSecs),
        serial_ids,
        session_payments,
        flaggers,
        user_id,
        session_seconds,
        session_seconds_label,
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return desiredData;
}

// Function to build rows for each developer (payment logic)
function buildRowsForDeveloper(grouped, developerId) {
  const dev = grouped?.[String(developerId)];
  if (!dev) return [];
  const buckets = ["1-7", "8-15", "16-23", "24-31"];
  let rid = 1;
  const rows = [];
  for (const b of buckets) {
    const arr = dev[b] || [];
    for (const it of arr) {
      const hoursNum = Number.isFinite(it?.hours) ? Number(it.hours) : 0;
      const paymentNum = Number(it?.payment || 0);

      // Skip empty sessions with no flaggers, hours, or payments
      if (Array.isArray(it.flaggers) && it.flaggers.length === 0 && hoursNum <= 0 && paymentNum <= 0) {
        continue;
      }

      rows.push({
        id: rid++,
        date: it.date,
        hours: hoursNum,
        label: typeof it.label === "string" ? it.label : formatHMS((hoursNum || 0) * 3600),
        payment: paymentNum,
        serial_ids: Array.isArray(it.serial_ids) ? it.serial_ids : [],
        session_payments: Array.isArray(it.session_payments) ? it.session_payments : [],
        flaggers: Array.isArray(it.flaggers) ? it.flaggers : [],
        user_id: Array.isArray(it.user_id) ? it.user_id : [],
        bucket: b,
      });
    }
  }
  return rows;
}
