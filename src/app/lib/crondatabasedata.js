// /app/lib/database.js
export async function fetchDataForCronJob(token) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 31); 
    const formattedEndDate = endDate.toISOString().split('T')[0];  // e.g., "2025-11-17"
    const formattedStartDate = startDate.toISOString().split('T')[0];  // e.g., "2025-10-17"
    const apiUrl = process.env.NEXT_PUBLIC_MAIN_HOST
      ? `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/time-sheet/by-date-range`
      : "/api/time-sheet/by-date-range";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" ,
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        startDate: formattedStartDate,  
        endDate: formattedEndDate,    
        userId: 2,              
        userRole: "Admin",    
        all: true,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch time-sheet data");
    }

    const data = await response.json();
    console.log("Fetched first 5 items from /api/time-sheet/by-date-range:", data.items.slice(0, 5));

    return data.items || []; 
  } catch (err) {
    console.error("Error fetching timesheet data:", err);
    throw new Error("Error fetching timesheet data");
  }
}

