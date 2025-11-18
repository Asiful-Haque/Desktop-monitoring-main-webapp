// C:\Users\User\Documents\Sourav\task-monitoring\PaymentTrigger.js
import fetch from 'node-fetch';
async function triggerPaymentAPI() {
  try {
    console.log("Starting API call...");

    // Sending a POST request to the /api/cronjob/trigger endpoint
    const res = await fetch("http://localhost:5500/api/cronjob/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
    });

    if (!res.ok) {
      throw new Error("Failed to call the API");
    }

    console.log("API call successful");
  } catch (error) {
    console.error("Error triggering API:", error);
  }
}

// Trigger the API call
triggerPaymentAPI();
