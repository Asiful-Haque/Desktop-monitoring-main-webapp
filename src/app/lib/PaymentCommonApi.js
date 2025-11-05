// /app/lib/payrollActions.js
// One file that contains: API calls + shared helpers + both submit actions.
// Behavior mirrors your existing code (toasts, logs, optimistic UI, abort policy).

import { toast } from "sonner";

/* --------------------------- API HELPERS (UNCHANGED) --------------------------- */

export async function apiGetLastTransaction() {
  const res = await fetch("/api/get-last-transaction");
  if (!res.ok) throw new Error("Failed to fetch last transaction number");
  const j = await res.json();
  return j.lastTransactionNumber;
}

export async function apiCreateTransaction(payload) {
  const res = await fetch("/api/create-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "Failed to create transaction");
  }
  return res.json();
}

export async function apiPostPaymentLogs({ currentUser, transaction_number, logs }) {
  console.log("logs to send to apiPostPaymentLogs:(((((((((((((((((", logs);
  const res = await fetch("/api/fit-payment-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  const res = await fetch("/api/update-flagger", {
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

export async function getNextTxnFactory(currentUser) {
  const last = await apiGetLastTransaction(); // e.g., Trx_tnt1_5
  const lastVal = parseInt(String(last).split("_")[2] || "0", 10);
  const tenantId = currentUser?.tenant_id;
  return (offset = 1) => `Trx_tnt${tenantId}_${lastVal + offset}`;
}

export async function createTxnAndLogs({ currentUser, hours, payment, txnNumber, data }) {
  console.log("data to send to apiCreateTransaction:---------------------", data);

  await apiCreateTransaction({
    transaction_number: txnNumber,
    hours,
    payment_of_transaction: payment,
    developer_id: currentUser?.id,
    status: "pending",
  });

  await apiPostPaymentLogs({
    currentUser,
    transaction_number: txnNumber,
    logs: data,
  });

  toast.success(`Transaction created: ${txnNumber}`);
}

/* ------------------------- ACTION: SUBMIT SINGLE ROW -------------------------- */
/**
 * Mirrors your handleProcess() exactly (optimistic flag, txn factory, create txn,
 * mark processed (single date + full clicked row), toasts, and row removal by id).
 *
 * Params:
 * - id, date: identify the row to process
 * - rows, setRows: full list + setter (to remove the row after success)
 * - processed, setProcessed: processed map + setter
 * - currentUser: { id, tenant_id }
 */
export async function submitSinglePayment({
  id,
  date,
  rows,
  setRows,
  processed,
  setProcessed,
  currentUser,
}) {
  // optimistic ON
  setProcessed((prev) => ({ ...prev, [id]: true }));

  // txn factory
  let makeTxn;
  try {
    makeTxn = await getNextTxnFactory(currentUser);
  } catch (e) {
    toast.error(e.message || "Failed to prepare transaction number");
    setProcessed((prev) => ({ ...prev, [id]: false }));
    return;
  }

  const newTransactionNumber = makeTxn(1);

  // find clicked row (unchanged behavior)
  const clickedRowLogs = rows.find((r) => r.id === id);
  console.log("clickedRowLogsxxxxxxxxxxxxxxxxxxxxxxxxxxxx:", clickedRowLogs);
  if (!clickedRowLogs) {
    toast.error("Clicked row not found.");
    setProcessed((prev) => ({ ...prev, [id]: false }));
    return;
  }

  // create transaction + logs
  try {
    await createTxnAndLogs({
      currentUser,
      hours: clickedRowLogs.hours,
      payment: clickedRowLogs.payment,
      txnNumber: newTransactionNumber,
      data: clickedRowLogs,
    });
  } catch (error) {
    console.error("create transaction/logs error:", error);
    toast.error(error.message || "Error creating the transaction");
    setProcessed((prev) => ({ ...prev, [id]: false }));
    return;
  }

  // mark processed (single date, data = full clicked row object)
  try {
    await apiMarkIdsProcessed({
      dates: [date],
      userId: currentUser?.id,
      data: clickedRowLogs,
    });

    toast.success("Marked as processed", {
      description: `Date ${date} • ${fmtMoney(clickedRowLogs.payment)} processed.`,
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
/**
 * Mirrors your handleProcessAllVisible() (optimistic batch, txn factory, per-row
 * create txn+logs with abort on first failure, then server mark with dates +
 * serial_ids.flat(), then remove rows by date).
 *
 * Params:
 * - currentRows: visible/page rows
 * - processed, setProcessed
 * - setRows
 * - currentUser
 */
export async function submitAllVisiblePayments({
  currentRows,
  processed,
  setProcessed,
  setRows,
  currentUser,
}) {
  const toProcess = currentRows.filter((r) => !processed[r.id]);
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
        data: row,
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
      userId: currentUser?.id,
      data: (data || []).flat(),
    });

    toast.success(`Marked ${toProcess.length} day(s) as processed`);
    setRows((prev) => prev.filter((r) => !dates.includes(r.date)));
  } catch (error) {
    console.error("mark processed all error:", error);
    toast.error("Failed to mark all rows as processed");
    // keep flags as-is (same as original)
  }
}
