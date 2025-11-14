// /app/lib/database.js
export async function fetchDataForCronJob(token) {
    console.log("Calling the 2nd api named /api/time-sheet/by-date-range from cronjob trigger");
    console.log("$$$$token",token);
  try {
    const apiUrl = process.env.NEXT_PUBLIC_MAIN_HOST
      ? `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/time-sheet/by-date-range`
      : "/api/time-sheet/by-date-range"; // Fallback to the relative URL if no env variable
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" ,
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        startDate: "2025-11-01",  // Adjust this according to your data
        endDate: "2025-11-31",    // Adjust this according to your data
        userId: 2,              // Adjust this according to your data
        userRole: "Admin",    // Adjust this according to your data
        all: true,
      }),
    });

    console.log("got response from /api/time-sheet/by-date-range with status:", response.status);

    if (!response.ok) {
      throw new Error("Failed to fetch time-sheet data");
    }

    const data = await response.json();
    console.log("Fetched first 5 items from /api/time-sheet/by-date-range:", data.items.slice(0, 5));
    // console.log("Data fetched from /api/time-sheet/by-date-range:", data);  
    return data.items || []; // Assuming data has the items field
  } catch (err) {
    console.error("Error fetching timesheet data:", err);
    throw new Error("Error fetching timesheet data");
  }
}

