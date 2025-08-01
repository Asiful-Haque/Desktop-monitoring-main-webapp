// import { AppDataSource } from './data-source'; // Import already initialized DataSource

// export async function getDataSource() {
//   if (!AppDataSource.isInitialized) {
//     try {
//       await AppDataSource.initialize();  // Initialize only once in data-source.js
//       console.log("✅ Database connection established");
//     } catch (err) {
//       console.error("❌ Failed to connect to DB:", err);
//       throw err;
//     }
//   }
//   return AppDataSource;  // Return the initialized DataSource
// }



// src/lib/typeorm/init-db.ts
import { AppDataSource } from "./data-source";

let isInitialized = false;

export const initDb = async () => {
  if (!isInitialized) {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("✅ Database connection established");
    }
    isInitialized = true;
  }
  return AppDataSource;
};
