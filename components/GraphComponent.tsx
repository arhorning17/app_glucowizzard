import React from 'react';
import { StyleSheet, View } from 'react-native';
import { VictoryChart, VictoryLine, VictoryScatter, VictoryAxis, VictoryGroup, VictoryBar, VictoryLabel, VictoryStack } from 'victory-native';
import LinearGradient from 'react-native-linear-gradient';

interface GlucoseGraphProps {
  data: { x: string; y: number }[];
}

//Create a function that converts the given string time to minutes for graph spacing
const convertTimeToSec = (timeStr : string): number => {
  if (!timeStr || !timeStr.includes(':')) return NaN; // Handle missing or invalid time
  const parts = timeStr.split(':').map(Number);
  
  if (parts.length < 3 || parts.some(isNaN)) return NaN;
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

const TIME_WINDOW = 120; // Show 2 minutes worth of data (120 seconds), hardcoded for now

const GlucoseGraph: React.FC<GlucoseGraphProps> = ({ data }) => {
  const processedData = data.slice(-40).map(entry => ({
    x : convertTimeToSec(entry.x),
    y : entry.y
  })
  ).filter(entry => !isNaN(entry.x));

  if (processedData.length === 0) return null;
 
  const firstDataPoint = processedData[0].x;
  const latestTime = processedData[processedData.length - 1].x;
  const earliestTime = Math.max(firstDataPoint, latestTime - TIME_WINDOW);

  //Use this to determine if graph is full (has 120 sec worth of data) for current time indicator
  //Log statements for debugging
  const isGraphFull = (latestTime - earliestTime >= 115);
  console.log(latestTime-earliestTime);
  console.log("latestTime:", latestTime);
  console.log("earliestTime:", earliestTime);
  console.log("isGraphFull:", isGraphFull);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 800, height: 500, position: 'relative' }}>

      <LinearGradient
        colors={['#FFFACD', '#FFFACD', '#ADFF2F', '#ADFF2F', '#FFA07A', '#FFA07A']} 
        locations={[0, 0.3, 0.3, 0.7, 0.7, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={[styles.gradientBackground, { height: 400 }]}
      />

      <VictoryChart 
        height={500}
        domain={{ x: [earliestTime, earliestTime + TIME_WINDOW], y: [990, 1200] }} // X-axis starts from 0 to 120 (2 minutes)
        domainPadding={10}
      >

        {/* Comment out line for now */}
        {/* <VictoryLine
            style={{ data: { stroke: "#c43a31" } }} // Color for the line
            data={processedData}
          /> */}

          <VictoryScatter
            style={{ data: { fill: "#c43a31" } }} // Color for the points
            size={4} // Size of each point
            data={processedData}
          />

          <VictoryAxis
            dependentAxis
            label="Glucose Rate (mg/dL)"
            style={{ 
              axisLabel: { padding: 38 },  
              tickLabels: { padding: 0 },  
            }}
          />
          <VictoryAxis
          label="Time (HH:MM)"
          style={{ 
            axisLabel: { padding: 25 },  
            tickLabels: { padding: 5 },  
          }}
          tickFormat={(tick) => {
            const minutes = Math.floor((tick % 3600) / 60);
            const seconds = tick % 60;
        
            // Only show labels if seconds == 0 
            if (seconds === 0) {
              const hours = Math.floor(tick / 3600);
              return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            } else {
              return ''; 
            }
          }}
          //Attempt to add label when graph is full indicating current time, this needs to be fixed
          tickLabelComponent={
            isGraphFull ? (
              <VictoryLabel text="Current Time" style={{ fill: "blue", fontSize: 14, fontWeight: "bold" }} />
            ) : undefined
          }
        />
      </VictoryChart>
      </View>
      </View>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    top: 50,
    left: 50,
    right: 500, 
    width: 700, 
    height: 300, 
    zIndex: -1, // Keeps it behind the graph
  },
});

export default GlucoseGraph;