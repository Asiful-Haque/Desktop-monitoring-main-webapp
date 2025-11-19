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
    if (d >= 3600) return Math.floor(d); // seconds
    if (d >= 60) return Math.floor(d * 60); // minutes
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
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(
    2,
    "0"
  )}s`;
}

export async function POST(req) {
  console.log("Starting call to /api/cronjob/trigger...");

  try {
    const authorizationHeader = req.headers.get("Authorization");
    console.log("Authorization header:", authorizationHeader);

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      throw new Error("Authorization header is missing or malformed.");
    }
    const token = authorizationHeader.split(" ")[1];
    console.log("Extracted token:", token);

    const data = await fetchDataForCronJob(token);
    if (!data || data.length === 0) {
      throw new Error("No data fetched for payroll process");
    }

    const daySessions = new Map();
    const rolesByUserId = new Map(); 

    // Process data and store roles for each user
    for (const row of data) {
      const startDt = parseISO(row?.task_start);
      const endDt = parseISO(row?.task_end);
      const anchor = startDt || endDt || parseISO(row?.work_date);
      if (!anchor) continue;

      const dayKey = keyInTZ(anchor, TZ);
      const secs = computeSeconds(row);
      const leftText =
        startDt && endDt
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
        user_id: row?.dev_user_id ?? row?.developer_id,
        session_payment: row?.session_payment ?? 0, 
        flagger: row?.flagger ?? 0, 
        tenant_id: row.tenant_id,
      };

      const item_user_id = item.user_id;
      const item_role = String(row?.role ?? row?.developer_role ?? "")
        .trim()
        .toLowerCase();

      if (Number.isFinite(item_user_id) && item_role) {
        rolesByUserId.set(item_user_id, item_role);
      }

      const list = daySessions.get(dayKey) || [];
      list.push(item);
      daySessions.set(dayKey, list);
    }

    // Process session data
    const desiredData = processSessions(daySessions);
    const { month, ...rest } = groupCurrentMonthForPayment(desiredData);
    const devTenantMapping = [];

    const devIds = Object.keys(rest).filter((k) => k !== "month");
    devIds.forEach((devId) => {
      const devData = rest[devId];
      let tenantIds = [];
      Object.keys(devData).forEach((bucketKey) => {
        const bucketData = devData[bucketKey];
        bucketData.forEach((session) => {
          if (session.tenant_ids) {
            tenantIds = [...new Set([...tenantIds, ...session.tenant_ids])];
          }
        });
      });

      console.log(`devId: ${devId}, tenant_ids: ${tenantIds}`);
      devTenantMapping.push({ devId, tenantIds });
      console.log(`devId: ${devId}, tenant_ids: ${tenantIds}`);
    });
    console.log("devTenantMapping:", devTenantMapping); 


    for (const devId of devIds) {
      const numericDevId = Number(devId);
      const role = rolesByUserId.get(numericDevId);
      if (role === "freelancer" || role === "freelance") {
        console.log(
          `Skipping payment processing for dev ${devId} because role is '${role}'`
        );
        continue;
      }

      const devBuckets = rest[devId];
      if (!devBuckets) continue;

      console.groupCollapsed(`PAY RUN → Dev ${devId}`);

      const rowsForDev = buildRowsForDeveloper(rest, devId);
      console.log("After buildRowsForDevelopers", rowsForDev);
      let processedMap = {};
      let rowsBag = [...rowsForDev];
      console.log("before loop", rowsForDev);
      const tenantMapping = devTenantMapping.find(
        (mapping) => mapping.devId === devId
      );
      const tenantIds = tenantMapping ? tenantMapping.tenantIds : [];
      const currentUser = {
        id: devId,
        tenant_id: tenantIds,
      };

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
          currentUser: currentUser,
          developerId: Number(devId),
          token: token,
        });
      }

      console.groupEnd();
    }
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

      // Log tenant_id for each session while extracting
      const tenant_ids = Array.from(
        new Set(
          sessions.map((s) => {
            const tenantId = s.tenant_id;
            // console.log(`Extracted tenant_id: ${tenantId} for date: ${date}`); // Log tenant_id
            return tenantId;
          })
        )
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
        tenant_ids, // Add tenant_ids to the desiredData
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
      if (
        Array.isArray(it.flaggers) &&
        it.flaggers.length === 0 &&
        hoursNum <= 0 &&
        paymentNum <= 0
      ) {
        continue;
      }

      rows.push({
        id: rid++,
        date: it.date,
        hours: hoursNum,
        label:
          typeof it.label === "string"
            ? it.label
            : formatHMS((hoursNum || 0) * 3600),
        payment: paymentNum,
        serial_ids: Array.isArray(it.serial_ids) ? it.serial_ids : [],
        session_payments: Array.isArray(it.session_payments)
          ? it.session_payments
          : [],
        flaggers: Array.isArray(it.flaggers) ? it.flaggers : [],
        user_id: Array.isArray(it.user_id) ? it.user_id : [],
        bucket: b,
      });
    }
  }
  return rows;
}
