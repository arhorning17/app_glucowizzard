import RNFS from "react-native-fs";

//Function to read data from a JSON file
export const readDataFromFile = async (filePath: string) => {
  try {
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      console.log(`File ${filePath} does not exist. Returning empty array.`);
      return [];
    }

    const fileContents = await RNFS.readFile(filePath, "utf8");
    const parsedData = JSON.parse(fileContents);

    //Map the parsed json data to time and glucose level values
    return parsedData.map((entry: any) => ({
      x: entry.time,
      y: Number(entry.glucoselevel), // Ensure glucose level is a number
    }));
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
};
