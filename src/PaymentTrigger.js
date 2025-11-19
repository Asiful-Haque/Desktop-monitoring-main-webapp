import fetch from 'node-fetch';  // For making POST requests
import 'dotenv/config';  // Load environment variables from .env file
import dotenv from 'dotenv';  

async function handleStartPayment() {
  console.log("dotenv version:", dotenv.version);
  try {
    console.log("Starting cron job to trigger payment...");

    // Fetch username and password (securely stored, like environment variables)
    console.log("NEXT_PUBLIC_MAIN_HOST:", process.env.NEXT_PUBLIC_MAIN_HOST);
    console.log("USERNAME:", process.env.USERNAME);
    console.log("PASSWORD:", process.env.PASSWORD);

    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;

    // Step 1: Call the cron job login API to get cron access and refresh tokens
    const loginRes = await fetch("http://localhost:5500/api/auth/login/cron", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "adm1@example.com", password: "456", isCronJob: true }),  
    });

    if (!loginRes.ok) {
      throw new Error("Login failed");
    }

    const loginData = await loginRes.json();

    if (!loginData.ok) {
      throw new Error("Invalid credentials or failed to fetch token");
    }

    // Step 2: Extract the cron tokens (access and refresh)
    const token = loginData.cron_access_token;  // Access token for cron job
    const cronRefreshToken = loginData.cron_refresh_token;  // Refresh token for cron job

    console.log("got the cron access ", token);

    // Step 3: Trigger the cron job API with the obtained cron access token
    const cronJobRes = await fetch("http://localhost:5500/api/cronjob/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,  // Pass the cron access token in the header
      },
      credentials: "same-origin",  // Ensure cookies (if needed) are sent with the request
    });

    if (!cronJobRes.ok) {
      throw new Error("Failed to call the cron job API");
    }

    // Step 4: Parse the response from the cron job API
    const cronJobData = await cronJobRes.json();
    console.log("Transaction created:", cronJobData);

    // Optionally, you can show a success message or handle the response data
    console.log("Transaction created");

  } catch (error) {
    console.error("Error triggering payment process:", error.message);  // Logging error to console
  }
}

// Execute the cron job function
handleStartPayment();
