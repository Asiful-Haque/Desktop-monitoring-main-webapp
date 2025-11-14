import { toast } from "sonner";
/* --------------------------- API HELPERS (UNCHANGED) --------------------------- */

export async function apiGetLastTransaction(token) {
  console.log("entered");
  console.log("entered..............", );
  const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/get-last-transaction`, {
    method: 'GET',
    cache: 'no-store',  // prevents caching
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json', 
    },
  });

  if(res.ok){
    console.log("response is ok");
  }
  if (!res.ok) throw new Error("Failed to fetch last transaction number");
  const j = await res.json();
    console.log("-----||", j.lastTransactionNumber);
  return j.lastTransactionNumber;
}

export async function apiCreateTransaction(payload) {
  const token = payload.token;
  console.log("Lpg token from payload.token", token);
  const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/create-transaction`, {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json', 
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "Failed to create transaction");
  }
  return res.json();
}

export async function apiPostPaymentLogs({ currentUser, transaction_number, logs, token }) {
  console.log("+_",currentUser);
  console.log("logs to send to apiPostPaymentLogs:((((((((((((((((( ", logs);
  const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/fit-payment-logs`, {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json', 
    },
    body: JSON.stringify({ currentUser, transaction_number, logs }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "Failed to save payment logs");
  }
  return res.json();
}

export async function apiMarkIdsProcessed({ dates, userId, data }) {
  console.log("Before api logs are ..........................", data);
  const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/update-flagger`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dates, flagger: 1, userId: userId || null, data }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "Failed to mark dates processed");
  }
  return res.json();
}

/* --------------------------- LOCAL UTILITIES (SAME) --------------------------- */

export const fmtMoney = (n) => `$${Number(n || 0).toLocaleString()}`;

export async function getNextTxnFactory(currentUser, token) {
  console.log("inthe get transacion function", currentUser);
  const last = await apiGetLastTransaction(token); // e.g., Trx_tnt1_5
  console.log("Last transaction", last);
  const lastVal = parseInt(String(last).split("_")[2] || "0", 10);
  const tenantId = currentUser?.tenant_id;
  return (offset = 1) => `Trx_tnt${tenantId}_${lastVal + offset}`;
}

/* ------------ NEW: Make rows safe for the backend (prevents 500s) ------------ */
function sanitizePayRow(row = {}) {
  const hoursNum = Number.isFinite(row?.hours) ? Number(row.hours) : 0;
  return {
    ...row,
    hours: hoursNum, // ensure number
    label: typeof row?.label === "string" ? row.label : `${hoursNum}h`,
    payment: Number(row?.payment) || 0,
    serial_ids: Array.isArray(row?.serial_ids) ? row.serial_ids : [],
    session_payments: Array.isArray(row?.session_payments)
      ? row.session_payments
      : [],
    flaggers: Array.isArray(row?.flaggers) ? row.flaggers : [],
    user_id: Array.isArray(row?.user_id) ? row.user_id : [],
  };
}

/**
 * createTxnAndLogs
 * - NEW: optional developerId override for admin submit-for-user.
 *   Defaults to currentUser.id -> no behavior change for existing flows.
 * - Uses sanitized data so hours/label/arrays are always valid.
 */
export async function createTxnAndLogs({
  currentUser,
  hours,
  payment,
  txnNumber,
  data,
  developerId, 
  token,
}) {
  const safeData = sanitizePayRow(data);
  const safeHours = Number.isFinite(hours) ? Number(hours) : 0;
  const safePayment = Number(payment) || 0;

  console.log("data to send to apiCreateTransaction:---------------------", safeData);

  await apiCreateTransaction({
    transaction_number: txnNumber,
    hours: safeHours,
    payment_of_transaction: safePayment,
    developer_id: developerId ?? currentUser?.id,
    status: "pending",
    token: token,
  });

  await apiPostPaymentLogs({
    currentUser,
    transaction_number: txnNumber,
    logs: safeData,
    token: token,
  });
}

/* ---------------------- DAILY PAYABLES BUILDER (NEW) ---------------------- */
/**
 * Build "PayrollComponent-style" daily rows from a detailsByDate map.
 * Includes only items with session_payment > 0.
 * Optionally filters to a specific user and excludes already processed (flagger === 1).
 *
 * Input requirements for each item in detailsByDate[date]:
 *   - seconds            (number)
 *   - session_payment    (number)
 *   - serial_id          (string|number)
 *   - user_id            (number)
 *   - flagger            (0|1) — if you want to exclude processed ones
 *
 * Output rows shape (same as PayrollComponent):
 *   { id, date, hours, label, payment, serial_ids }
 */
export function buildDailyPayablesFromDetails(
  detailsByDate,
  { userId, excludeProcessed = true } = {}
) {
  if (!detailsByDate) return [];

  console.log(
    "detailsByDate in buildDailyPayablesFromDetails:............common..............",
    detailsByDate
  );

  const dayMap = new Map(); // dateKey -> { secs, payment, serial_ids[] }
  for (const [dateKey, items] of Object.entries(detailsByDate)) {
    const list = Array.isArray(items) ? items : [];
    const filtered = list.filter((it) => {
      if (userId != null && it.user_id !== userId) return false;
      if (excludeProcessed && Number(it?.flagger) === 1) return false;
      const pay = Number(it?.session_payment) || 0;
      return pay > 0;
    });
    if (!filtered.length) continue;

    let secs = 0;
    let payment = 0;
    const serial_ids = [];
    for (const it of filtered) {
      secs += Number(it?.seconds || 0);
      payment += Number(it?.session_payment || 0);
      if (it?.serial_id != null) serial_ids.push(it.serial_id);
    }

    const curr = dayMap.get(dateKey) || { secs: 0, payment: 0, serial_ids: [] };
    curr.secs += secs;
    curr.payment += payment;
    curr.serial_ids.push(...serial_ids);
    dayMap.set(dateKey, curr);
  }

  let idCounter = 1;
  return Array.from(dayMap.entries())
    .map(([date, { secs, payment, serial_ids }]) => ({
      id: idCounter++,
      date,
      hours: Math.round((secs / 3600) * 100) / 100,
      label: secondsToLabel(secs),
      payment,
      serial_ids,
    }))
    .filter((r) => r.payment > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function secondsToLabel(totalSec) {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

/* ------------------------- ACTION: SUBMIT SINGLE ROW -------------------------- */

export async function submitSinglePayment({
  id,
  date,
  rows,
  setRows,
  processed,
  setProcessed,
  currentUser,
  developerId,
  token,
}) {
  // optimistic ON
  setProcessed((prev) => ({ ...prev, [id]: true }));

    if (token) {
    console.log("Token passed:", token);
  } else {
    console.log("No token passed");
  }
  // txn factory
  let makeTxn;
  console.log("id is ...........................", id);
  console.log("date is ...........................", date);
  console.log("rows in submitSinglePayment:...........................", rows[0]);
  console.log("developerId in submitSinglePayment:...........................", developerId);
  console.log("currentUser in submitSinglePayment:...........................", currentUser);
  try {
    console.log("In the try", Number(currentUser));
    makeTxn = await getNextTxnFactory(Number(currentUser), token);
    console.log("makeTxn function obtained:", makeTxn);
  } catch (e) {
    // toast.error(e.message || "Failed to prepare transaction number");
    setProcessed((prev) => ({ ...prev, [id]: false }));
    return;
  }

  const newTransactionNumber = makeTxn(1);

  // find clicked row
  const clickedRowLogs = rows.find((r) => r.id === id);
  console.log("clickedRowLogsxxxxxxxxxxxxxxxxxxxxxxxxxxxx:", clickedRowLogs);
  if (!clickedRowLogs) {
    toast.error("Clicked row not found.");
    setProcessed((prev) => ({ ...prev, [id]: false }));
    return;
  }

  // SANITIZE row before using it
  const safeRow = sanitizePayRow(clickedRowLogs);

  // create transaction + logs
  try {
    await createTxnAndLogs({
      currentUser,
      hours: safeRow.hours,
      payment: safeRow.payment,
      txnNumber: newTransactionNumber,
      data: safeRow,
      developerId,
      token,
    });
  } catch (error) {
    console.error("create transaction/logs error:", error);
    toast.error(error.message || "Error creating the transaction");
    setProcessed((prev) => ({ ...prev, [id]: false }));
    // toast.success(`Transaction created: ${txnNumber}`);
    return;
  }

  // mark processed
  try {
    await apiMarkIdsProcessed({
      dates: [date],
      userId: developerId ?? currentUser?.id,
      data: safeRow,
    });

    toast.success("Marked as processed", {
      description: `Date ${date} • ${fmtMoney(safeRow.payment)} processed.`,
    });

    // remove this row from UI
    setRows((prevRows) => prevRows.filter((r) => r.id !== id));
  } catch (error) {
    console.error("mark processed error:", error);
    toast.error("Failed to process the date");
    setProcessed((prev) => ({ ...prev, [id]: false }));
  }
}

/* ----------------------- ACTION: SUBMIT ALL VISIBLE ROWS ---------------------- */

export async function submitAllVisiblePayments({
  currentRows,
  processed,
  setProcessed,
  setRows,
  currentUser,
  developerId, // optional (admin submit-for-user)
}) {
  // sanitize all rows up-front so we never pass null/invalid shapes to API
  const sanitizedRows = (currentRows || []).map(sanitizePayRow);

  const toProcess = sanitizedRows.filter((r) => !processed[r.id]);
  console.log("toProcesssssssssssssssssssssssssss:", toProcess);

  if (toProcess.length === 0) {
    toast.error("No rows to process.");
    return;
  }

  // optimistic flags ON
  const updates = {};
  toProcess.forEach((r) => (updates[r.id] = true));
  setProcessed((prev) => ({ ...prev, ...updates }));

  // txn factory
  let makeTxn;
  try {
    makeTxn = await getNextTxnFactory(currentUser);
  } catch (e) {
    toast.error(e.message || "Failed to prepare transaction number");
    setProcessed((prev) => {
      toProcess.forEach((r) => (prev[r.id] = false));
      return { ...prev };
    });
    return;
  }

  // per-row create txn + logs; abort on first failure
  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    const txn = makeTxn(1 + i);

    try {
      console.log("row to send to createTxnAndLogs:>>>>>>>>>>>>>>>-", row);
      await createTxnAndLogs({
        currentUser,
        hours: row.hours,
        payment: row.payment,
        txnNumber: txn,
        data: row, // already sanitized
        developerId,
      });
    } catch (err) {
      console.error("create transaction/logs error:", err);
      toast.error(err.message || "Error creating the transaction");
      setProcessed((prev) => {
        prev[row.id] = false;
        return { ...prev };
      });
      return;
    }
  }

  // mark processed for batch (dates + serial_ids.flat())
  try {
    console.log("toProcesssssssssssssssssssssssssss :", toProcess);
    const dates = toProcess.map((r) => r.date);
    const data = toProcess.map((r) => r.serial_ids);
    console.log(
      "data to send to apiMarkIdsProcessed:..........................",
      (data || []).flat()
    );

    await apiMarkIdsProcessed({
      dates,
      userId: developerId ?? currentUser?.id,
      data: (data || []).flat(),
    });

    toast.success(`Marked ${toProcess.length} day(s) as processed`);
    setRows((prev) => prev.filter((r) => !dates.includes(r.date)));
  } catch (error) {
    console.error("mark processed all error:", error);
    toast.error("Failed to mark all rows as processed");
    // keep flags as-is
  }
}
