// src/db/glucoseDB.ts
import * as SQLite from "expo-sqlite";
import RNFS from "react-native-fs";

const db = SQLite.openDatabase("glucose_data.db");

// Initialize tables
export const initDB = () => {
  db.transaction((tx) => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS glucose_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT UNIQUE ON CONFLICT IGNORE,
        glucoseLevel INTEGER,
        batteryLevel TEXT
      );`
    );

    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS event_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        event TEXT
      );`
    );
  });
};

// Log an event
export const logEvent = (event: string) => {
  const timestamp = new Date().toISOString();
  db.transaction((tx) => {
    tx.executeSql(
      "INSERT INTO event_log (timestamp, event) VALUES (?, ?);",
      [timestamp, event]
    );
  });
};

// Save glucose data (duplicates ignored)
export const saveDataToDB = (data: { time: string; glucoseLevel: number; batteryLevel: string }) => {
  db.transaction((tx) => {
    tx.executeSql(
      "INSERT OR IGNORE INTO glucose_data (time, glucoseLevel, batteryLevel) VALUES (?, ?, ?);",
      [data.time, data.glucoseLevel, data.batteryLevel],
      (_, result) => {
        if (result.rowsAffected === 0) {
          console.log("Duplicate entry ignored:", data);
          logEvent(`Duplicate ignored at ${data.time}`);
        } else {
          console.log("Data saved:", data);
          logEvent(`Data saved at ${data.time}`);
        }
      }
    );
  });
};

// Read all glucose data 
export const readDataFromDB = (callback: (rows: any[]) => void) => {
  db.transaction((tx) => {
    tx.executeSql(
      "SELECT * FROM glucose_data ORDER BY time ASC;",
      [],
      (_, result) => {
        const rows = result.rows._array ?? [];
        callback(rows);
      },
      (_, error) => {
        console.error("Error reading data from DB:", error);
        return false;
      }
    );
  });
};

// Clear all glucose data safely
export const clearDatabase = (
  setGlucoseHistory: Function,
  setLongGlucoseHistory: Function
) => {
  db.transaction((tx) => {
    tx.executeSql(
      "DELETE FROM glucose_data;",
      [],
      () => {
        console.log("✅ All glucose data cleared from DB.");
        setGlucoseHistory([]);
        setLongGlucoseHistory([]);
        logEvent("Database cleared");
      },
      (_, error) => {
        console.error("❌ Error clearing database:", error);
        logEvent("Database clear failed");
        return false; // stops transaction
      }
    );
  });
};

export const exportDataToCSV = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM glucose_data ORDER BY time ASC;",
        [],
        async (_, result) => {
          const rows = result.rows._array;
          if (rows.length === 0) {
            reject("No data available to export.");
            return;
          }

          let csv = "time,glucoseLevel,batteryLevel\n";

          for (const row of rows) {
            csv += `${row.time},${row.glucoseLevel},${row.batteryLevel}\n`;
          }

          try {
            const filePath = `${RNFS.DocumentDirectoryPath}/glucose_data.csv`;
            await RNFS.writeFile(filePath, csv, "utf8");
            console.log(`✅ CSV exported to: ${filePath}`);
            resolve(filePath as string); // ✅ Now TypeScript knows it's a string
          } catch (err) {
            console.error("❌ Error writing CSV:", err);
            reject(err);
          }
        },
        (_, error) => {
          console.error("❌ SQL error exporting data:", error);
          reject(error);
          return true;
        }
      );
    });
  });
};