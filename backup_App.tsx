import { SafeAreaView, TextInput, StyleSheet, Text, View, Image, 
    StatusBar, Alert, Dimensions, TouchableHighlight, Switch } from 'react-native';
import { VictoryChart, VictoryTheme, VictoryScatter, VictoryAxis} from 'victory-native';
import React, {useState, useEffect} from "react";
import { Button } from "@react-native-material/core";
import DeviceModal from "./DeviceConnectionModal";
import useBLE from "./useBLE";
import base64 from "react-native-base64";
import Styles from "./constants/Styles";
import { initDB, saveDataToDB, readDataFromDB, clearDatabase, logEvent, exportDataToCSV } from "./src/database";
import Share from "react-native-share";
import RNFS from "react-native-fs";

const App = () => {
const {
requestPermissions,
scanForPeripherals,
allDevices,
connectToDevice,
connectedDevice,
freqRate,
disconnectFromDevice,
sendDataToDevice,
startFileListener
} = useBLE();
const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

const scanForDevices = async () => {
const isPermissionsEnabled = await requestPermissions();
if (isPermissionsEnabled) {
 scanForPeripherals();
}
};

const hideModal = async () => {
setIsModalVisible(false);
};

const openModal = async () => {
scanForDevices();
setIsModalVisible(true);
};

var RNFS = require('react-native-fs');
const filePath = RNFS.DocumentDirectoryPath + "/filename" + ".txt";
const writetoFile = (saveData: number) => {
RNFS.writeFile(filePath, {saveData}, "utf8")
}

const currentDate = Math.floor(Date.now() / 1000);  //GMT Time
const currentDateEST = currentDate-14400; //18000 for Daylight saving is Off
var StartGLucose='1110';
var StopGLucose='1111';
var StartAlignment='1112';
var StopAlignment='1113';
var allLed='1114';
var singleLed='1115';
var ReadFiledata='1116';
var DisconnectBLE='1117';

/* Split Data using "/" from proximity communicator: Timestamp(epoch time); frequency; batteryVal; errorVal*/
const freqnum=base64.decode(freqRate);
const ValueArr=freqnum.split("/");
const timnum=getNum(ValueArr[0]);
const freqVal=parseInt(ValueArr[1]);
const batteryVal=parseInt(ValueArr[2]);
const errorVal=parseInt(ValueArr[3]);

function getNum(val: any): number | null {
const n = Number(val);
return Number.isFinite(n) ? n : null;
}

//Automatically updates the proximity communicator on BLE Pairing with App
useEffect(() => {       
if ((connectedDevice)&&(timnum==0)&&(freqVal==0)) {
sendDataToDevice("1113" + '/' + currentDateEST);
}  
}, [errorVal]);

useEffect(() => {
if ((errorVal==1)&&connectedDevice) {
 startFileListener(connectedDevice);
 sendDataToDevice("1113" + '/' + currentDateEST);
 setTimeout(() => sendDataToDevice('1116'), 1000);
 Alert.alert(
   'Bluetooth Connection:',
   'Success!!!',
   [{ text: 'OK' }]
 );
}  
}, [errorVal]);



const ResetGlucoseChart = () => {
const now = Date.now();
setData([{ x: now, y: 0 }]);        // numeric x
};

const ResetAlignmentChart = () => {
const now = Date.now();
setData([{ x: now, y: 0 }]);        // numeric x
};

const [isGLucose, setIsGlucose] = useState(false);
const [isGlucoseButtonEnabled, setGlucoseButtonEnabled] = useState<boolean>(true);
const toggleGlucoseButtonEnabled = () => {
setGlucoseButtonEnabled(!isGlucoseButtonEnabled);
};  

const [isAlignment, setIsAlignment] = useState(false);
const [isAlignmentButtonEnabled, setAlignmentButtonEnabled] = useState<boolean>(true);
const toggleAlignmentButtonEnabled = () => {
setAlignmentButtonEnabled(!isAlignmentButtonEnabled);
};

const [isReadDataButtonEnabled, setReadDataButtonEnabled] = useState<boolean>(true);
const toggleReadDataButtonEnabled = () => {
setReadDataButtonEnabled(!isReadDataButtonEnabled);
};

const StartGlucoseReading = () => {
sendDataToDevice(StartGLucose);
ResetGlucoseChart();
setIsGlucose(true);
toggleGlucoseButtonEnabled();
toggleReadDataButtonEnabled();
};

const StopGlucoseReading = () => {
sendDataToDevice(StopGLucose);
toggleGlucoseButtonEnabled();
toggleReadDataButtonEnabled();
setIsGlucose(false);
};

const StartAlignmentReading = () => {
sendDataToDevice(StartAlignment);
ResetAlignmentChart();
setIsAlignment(true);
toggleAlignmentButtonEnabled();
toggleReadDataButtonEnabled();
};

const StopAlignmentReading = () => {
sendDataToDevice(StopAlignment);
toggleAlignmentButtonEnabled();
toggleReadDataButtonEnabled();
setIsAlignment(false);
};

const [isEnabled, setIsEnabled] = useState<boolean>(false);
const toggleSwitch = () => {
setIsEnabled(previousState => !previousState)
if (isEnabled) {
 sendDataToDevice(allLed);
}
else {
 sendDataToDevice(singleLed);
}
};

const StartReadFiledata = () => {
sendDataToDevice(ReadFiledata);
};

const BleTurnOff = () => {
sendDataToDevice(DisconnectBLE);
disconnectFromDevice();
};

function toMinutesandSeconds(totalSeconds: number) {
const date = new Date(totalSeconds * 1000);
const hours = date.getHours();      // Local time hours
const minutes = date.getMinutes();  // Local time minutes
const seconds = date.getSeconds();  // Local time seconds

if(isAlignment) {                                                 ///?????? Change to isGlucose later
 var result = hours +':'+ minutes;
 if (minutes < 10) {var result = hours +':'+ '0'+ minutes;}
}
else {
 var result = minutes +':'+ seconds;
 if (seconds < 10) {var result = minutes +':'+ '0'+ seconds;}
}
return result;
}

function toHoursAndMinutes(totalSeconds: number) {
const date = new Date(totalSeconds * 1000);
const hours = date.getHours();      // Local time hours
const minutes = date.getMinutes();  // Local time minutes
const seconds = date.getSeconds();  // Local time seconds

var result = hours +':'+ minutes;
if (minutes < 10) {var result = hours +':'+ '0'+ minutes;}
if (seconds < 10) {var result = minutes +':'+ '0'+ seconds;}

return result;

}
/*//-----------------------------------------------------------------------------
useEffect(() => {
// Start a timer that runs every 30 seconds
const interval = setInterval(() => {
 addFakeReading();
}, 10000); // 10,000 ms = 10 seconds

// Clean up when component unmounts
return () => clearInterval(interval);
}, []); // run once when the component mounts

let lastFakeEntry: { time: string; glucoseLevel: number; batteryLevel: string } | null = null;

const addFakeReading = () => {
let fakeEntry;

// 25% chance to reuse the last entry → duplicate test
if (lastFakeEntry && Math.random() < 0.25) {
 fakeEntry = { ...lastFakeEntry };
 console.log("⚠️ Sending duplicate fake data:", fakeEntry);
} else {
 const fakeGlucose = Math.floor(Math.random() * 80) + 70;   // 70–150 mg/dL
 const fakeBattery = Math.floor(Math.random() * 50) + 50;   // 50–100 %
 const fakeTime = new Date().toISOString();

 fakeEntry = {
   time: fakeTime,
   glucoseLevel: fakeGlucose,
   batteryLevel: fakeBattery.toString(),
 };

 lastFakeEntry = fakeEntry; // keep track of latest for possible duplication
 console.log("✅ Fake data added:", fakeEntry);
}

saveDataToDB(fakeEntry);
};
//--------------------------------------------------------------------------------
*/
// --- Types ---
type DataPoint = { x: number; y: number };

// --- Constants & States ---
const WINDOW_MS = 3 * 60 * 1000; // 3-minute window
const [data, setData] = useState<DataPoint[]>([]);
const [now, setNow] = useState(Date.now());

// --- Initialize DB + Load Initial Data ---
useEffect(() => {
console.log("Initializing database...");
initDB();
readDataFromDB((rows) => {
 if (!rows || rows.length === 0) {
   console.log("No previous data in database.");
   setData([]);
   return;
 }
 const formatted = rows.map((r: any) => ({
   x: new Date(r.time).getTime(),   // handles ISO timestamps
   y: Number(r.glucoseLevel),
 })).filter(p => !isNaN(p.x) && !isNaN(p.y));
 setData(formatted);
});
}, []);

// --- Keep "now" ticking for smooth auto-scroll ---
useEffect(() => {
const timer = setInterval(() => setNow(Date.now()), 300); // shifts graph every 300 ms
return () => clearInterval(timer);
}, []);

// --- When new BLE data arrives, save and refresh chart ---
useEffect(() => {
// Don’t do anything if no device or empty readings
if (!connectedDevice) return;

// Make sure freqVal is a valid number 
const numVal = Number(freqVal); 
if (!Number.isFinite(numVal) || numVal < 0) { 
 console.warn("Skipping invalid Glucose packet:", freqVal); 
 return; 
}

const newEntry = {
 time: new Date().toISOString(),
 glucoseLevel: numVal,
 batteryLevel: batteryVal && Number.isFinite(Number(batteryVal))
   ? batteryVal.toString()
   : "",
};

// Save valid data to DB
saveDataToDB(newEntry);

// Immediately reload database and update chart
readDataFromDB((rows: any[]) => {
 if (!rows) return;

 const formatted = rows
   .map(r => ({
     x: new Date(r.time).getTime(),
     y: Number(r.glucoseLevel),
   }))
   // Drop anything invalid before giving to graph
   .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

 // Keep last 500 points
 setData(formatted.slice(-500));
});
}, [freqVal, batteryVal, connectedDevice]);

// Always sanitize before plotting
const safeData = data.filter(
p => Number.isFinite(p.x) && Number.isFinite(p.y)
);

// --- Compute auto-scrolling X-domain from safeData ---
let chartDomainX: [number, number];
if (safeData.length > 0) {
const last = safeData[safeData.length - 1].x;
chartDomainX = [last - WINDOW_MS, last];
} else {
chartDomainX = [now - WINDOW_MS, now]; // fallback before any data
}

const [patientName, setPatientName] = useState("");
const [investigatorName, setInvestigatorName] = useState("");
const [clinicalSite, setClinicalSite]  = useState("");
const [dayNumber, setDayNumber]  = useState("");

const handleClear = () => {
Alert.alert(
 "Clear all data?",
 "This will permanently delete all stored glucose readings.",
 [
   { text: "Cancel", style: "cancel" },
   {
     text: "Clear",
     style: "destructive",
     onPress: () => {
       clearDatabase(setData, setData);
       setData([]);            // reset graph
       console.log("Graph reset after database clear.");
     },
   },
 ]
);
};

return (

<SafeAreaView style={styles.container}>
 <StatusBar animated={true} backgroundColor="lightblue"/>
 <Image source={require('./Images/logo.jpg')} style={styles.logoImage}/>
 <View style={styles.freqRateTitleWrapper}>
   {connectedDevice ? (
   <>
     <View style={styles.UserContainer}>
       <Text style={styles.batteryTitleText}>Battery Level:  {getNum(batteryVal)}%</Text>
       <Text style={styles.connectionText}>Device Connected</Text>
       <Text style={styles.patientTitleText}></Text>
       <Text style={styles.patientTitleText}>Patient (Name/ID): {patientName}</Text>
       <Text style={styles.patientTitleText}>Clinical Site: {clinicalSite}</Text>
       <Text style={styles.patientTitleText}>Trial Day:  {dayNumber}</Text>
     </View>
     <Text style={styles.FrequencyTitleText}>Frequency (Hz)</Text>
     <View style={{width: 120, height: 120, justifyContent: "center", borderRadius: 120/2, backgroundColor: 'lightblue' }}>
       {/*<Text style={{alignSelf: 'center', fontWeight: 'bold', color: 'white', fontSize: 40,}}>{getNum(freqVal)}</Text>*/ }
       <Text style={{alignSelf: 'center', fontWeight: 'bold', color: 'white', fontSize: 40,}}>{getNum(freqVal)}</Text>
     </View>

     {/* Starts Victory Chart XL*/ }
     <View style={styles.chartcontainer}>
       <VictoryChart
         scale={{ x: "time", y: "linear" }}
         domain={{ x: chartDomainX, y: [0, 500] }}
         padding={{ top: 30, bottom: 50, right: 20, left: 60 }}
         width={Dimensions.get("window").width - 10}
         height={450}
         theme={VictoryTheme.grayscale}
       >
         <VictoryAxis
           dependentAxis
           label="Frequency (Hz)"
           style={{
             axisLabel: { padding: 40 },
             tickLabels: { padding: 0 },
             grid: { stroke: "white", strokeDasharray: 3 }
           }}
         />

         <VictoryAxis
           tickFormat={(t) =>
             new Date(t).toLocaleTimeString([], {
               hour: "2-digit",
               minute: "2-digit",
               second: "2-digit",
             })
           }
           style={{
             tickLabels: { padding: 5 },
             axisLabel: { padding: 25 },
           }}
           fixLabelOverlap
         />

         <VictoryScatter
           size={2}
           style={{ data: { fill: "#8b0000" } }}
           data={safeData}
           x="x"
           y="y"
         />
       </VictoryChart>
     </View>

     <View style={styles.FrequencyTitleText}>
       <Text>
         {isAlignment ? 'HH:MM:SS' : 'MM:SS'}                       {/*///?????? Change to isGlucose later*/}
       </Text>
     </View>
     
     <View style={styles.buttonStyle}>
     <Text>
         {isEnabled ? 'ON-Center' : 'ON-All   '}
     </Text>
       {!isAlignmentButtonEnabled
         ? <Switch trackColor={{false: '#767577', true: '#81b0ff'}}
             thumbColor={isEnabled ? 'blue' : 'blue'}
             ios_backgroundColor="#3e3e3e"
             onValueChange={toggleSwitch}
             value={isEnabled}
           />
         : <Switch trackColor={{false: '#767577', true: '#81b0ff'}}
         thumbColor={isEnabled ? 'blue' : 'blue'}
         ios_backgroundColor="#3e3e3e"
         onValueChange={toggleSwitch}
         value={isEnabled}
         disabled
       />
       }
   </View>

     <View style={styles.Textcontainer}>            
       <View style={styles.fixToText}>
         <View style={styles.alternativeLayoutButtonContainer}>
           <Button title="Start Alignment" onPress={StartAlignmentReading} color="lightblue"
           disabled={(!isAlignmentButtonEnabled) || (isGLucose)} 
           />            
         </View>
           <View style={styles.alternativeLayoutButtonContainer}>
             <Button title="Stop Alignment" onPress={StopAlignmentReading}  color="lightblue" 
             disabled={isAlignmentButtonEnabled}
             />
           </View>        
       </View>

       <View style={styles.fixToText}>
         <View style={styles.alternativeLayoutButtonContainer2}>
           <Button title="  Start  Glucose  " onPress={StartGlucoseReading} color="lightblue"
           disabled={(!isGlucoseButtonEnabled) || (isAlignment)} 
           />            
         </View>
         <View style={styles.alternativeLayoutButtonContainer2}>
           <Button title="  Stop  Glucose  " onPress={StopGlucoseReading}  color="lightblue"
             disabled={isGlucoseButtonEnabled}
             />
         </View>     
       </View>

       <View style={styles.fixToText}>
         <View style={styles.alternativeLayoutButtonContainer2}>
           <Button
             title="Clear Database"
             onPress={handleClear}
             color="lightblue"
           />
         </View>
         <View style={styles.alternativeLayoutButtonContainer2}>
         <Button
           title="Export CSV"
           onPress={async () => {
             try {
               const filePath = await exportDataToCSV();
               const exists = await RNFS.exists(filePath);
               if (!exists) throw new Error("File not found after export.");

               // --- 1️⃣ Copy to a shareable cache directory on Android ---
               let sharePath = filePath;
               if (Platform.OS === "android") {
                 const destPath = `${RNFS.CachesDirectoryPath}/glucose_data.csv`;
                 await RNFS.copyFile(filePath, destPath);
                 sharePath = `file://${destPath}`; // important: prefix for Android
               }

               // --- 2️⃣ Open the share sheet ---
               await Share.open({
                 title: "Share Glucose Data CSV",
                 message: "Here is my exported glucose data from Glucowizzard.",
                 url: sharePath,
                 type: "text/csv",
               });

               console.log("✅ CSV exported & shared successfully:", sharePath);
             } catch (error: any) {
               console.error("❌ Export/share failed:", error);
               Alert.alert("Export Failed", "Unable to export or share CSV file. Please try again.");
             }
           }}
           color="lightblue"
         />
         </View>
       </View>
     </View>
                 
   </>
   ) : (
     <View style={Styles.login_wrapper}>
       <Text style={Styles.TextForm}>Enter Patient's Details and Press "Sign in"</Text>
       <View style={Styles.form}>
         <TextInput
           style={Styles.form_input}
           value={undefined}
           placeholder={'Patient (Name/ID)                    '}
           onChangeText={(text) => setPatientName(text)}
           autoCapitalize={'none'}
         />
         <TextInput
           style={Styles.form_input}
           value={undefined}
           placeholder={'Investigator        '}
           onChangeText={(text) => setInvestigatorName(text)}
           autoCapitalize={'none'}
         />
         <TextInput
           style={Styles.form_input}
           value={undefined}
           placeholder={'Clinical site        '}
           onChangeText={(text) => setClinicalSite(text)}
           autoCapitalize={'none'}
         />
         <TextInput
           style={Styles.form_input}
           value={undefined}
           placeholder={'Day        '}
           onChangeText={(text) => setDayNumber(text)}
           autoCapitalize={'none'}
         />
       </View>
     </View>
   )}
   </View>

 <TouchableHighlight
   underlayColor="#30aaff"
   activeOpacity={0.7}
   onPress={connectedDevice ? BleTurnOff : openModal}
   style={styles.ctaButton}>
   <Text style={styles.ctaButtonText}>
     {connectedDevice ? "Disconnect Bluetooth" : "Sign in"}
   </Text>
 </TouchableHighlight>

 <DeviceModal
   closeModal={hideModal}
   visible={isModalVisible}
   connectToPeripheral={connectToDevice}
   devices={allDevices}
 />
</SafeAreaView>

);
};

const styles = StyleSheet.create({
buttonStyle: {
marginTop: 50,
marginLeft:550,
marginHorizontal: 40,
justifyContent: 'space-evenly',
},
freqRateTitleWrapper: {
flex: 1,
alignItems: "center",
},
container: {
flex: 1,
justifyContent: "center",
backgroundColor: "white",
},
logoImage: {
width: 102,
height: 32,
marginTop: '1%',
},
alternativeLayoutButtonContainer: {
marginTop: -70,
marginLeft: 40,
marginHorizontal: -10,
alignContent:'center',
justifyContent: 'space-evenly',
},
alternativeLayoutButtonContainer1: {
marginLeft: 0,
alignContent:'center',
justifyContent: 'space-evenly',
},
alternativeLayoutButtonContainer2: {
marginTop: 30,
marginLeft: 40,
marginHorizontal: -10,
alignContent:'center',
justifyContent: 'space-evenly',
},
alternativeLayoutButtonContainer3: {
marginTop: 15,
marginLeft: 100,
marginHorizontal: 95,
alignContent:'center',
justifyContent: 'space-evenly',
},
fixToText: {
flex: 0,
flexDirection: 'row',
justifyContent: 'space-between'
},
chartcontainer: {
flex: 1,
justifyContent: "center",
alignItems: "center",
backgroundColor: "lightblue",
marginTop: 20,
maxHeight: 415,
},
Textcontainer: {
flex: 1,
backgroundColor: "white",
marginTop: 0,
maxHeight: 115,
justifyContent: "center",
alignItems: "center",
},
batteryTitleText: {
fontSize: 17,
fontWeight: "bold",
color: "black",
textAlign:"right",
marginTop: -25,
},
patientTitleText: {
flex: 0,
fontSize: 17,
fontWeight: "bold",
color: "black",
},
UserContainer: {
flex: 0,
backgroundColor: "white",
maxHeight: 150,
},
connectionText: {
fontSize: 17,
fontWeight: "bold",
color: "green",
marginLeft: 535,
},
FrequencyTitleText: {
fontSize: 30,
fontWeight: "bold",
textAlign: "center",
marginHorizontal: 20,
color: "blue",
marginTop: 5,
},
FrequencyTitleText1: {
fontSize: 70,
fontWeight: "bold",
textAlign: "center",
marginHorizontal: 20,
color: "blue",
},
ctaButton: {
backgroundColor: "lightblue",
justifyContent: "center",
alignItems: "center",
height: 50,
marginHorizontal: 20,
marginBottom: 5,
borderRadius: 8,
},
ctaButtonText: {
fontSize: 25,
justifyContent: "center",
alignItems: "center",
fontWeight: "bold",
color: "white",
},
appColors: {
color: '#007FFF',
primaryInactive: 'rgba(0,127,255,0.75)',
secondary: '#99FFFF',
error: '#fc6d47',
},
});

export default App;