import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { VictoryChart, VictoryLine, VictoryScatter, VictoryAxis, VictoryGroup, VictoryBar, VictoryLabel, VictoryStack } from 'victory-native';
import {LinearGradient} from 'expo-linear-gradient';

//Graph will take data in form of (string, number) representing (time, glucoseLevel)
interface GlucoseGraphProps {
  data: { x: string; y: number }[];
}

//Create a function that converts the given string time to seconds for graph spacing
const convertTimeToSec = (timeStr : string): number => {
  if (!timeStr || !timeStr.includes(':')) return NaN; // Handle missing or invalid time
  const parts = timeStr.split(':').map(Number);
  
  if (parts.length < 3 || parts.some(isNaN)) return NaN;
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

const TIME_WINDOW = 86400; // Show 1 day worth of data

const GlucoseGraph: React.FC<GlucoseGraphProps> = ({ data }) => {

  //THIS NEEDS TO BE FIXED, probably only take last x number of data points
  const processedData = data.map(entry => ({
    x : convertTimeToSec(entry.x),
    y : entry.y
  })
  ).filter(entry => !isNaN(entry.x));

  const averagedData = [];
  for (let i = 0; i < processedData.length - 1; i += 8) {
    const avgX = (processedData[i].x + processedData[i + 1].x + processedData[i + 2].x + processedData[i + 3].x + 
      processedData[i + 4].x + processedData[i + 5].x + processedData[i + 6].x + processedData[i + 7].x
    ) / 8;
    const avgY = (processedData[i].y + processedData[i + 1].y + processedData[i + 2].y + processedData[i + 3].y + 
      processedData[i + 4].y + processedData[i + 5].y + processedData[i + 6].y + processedData[i + 7].y
    ) / 8;
    averagedData.push({ x: avgX, y: avgY });
  }

  //If there is no data do not display a graph
  if (processedData.length === 0) return null;
 
  //Take the time of the latest data point
  const latestTime = processedData[processedData.length - 1].x;
  //Take max between 0 and potential earliest time (avoid negatives)
  const earliestTime = Math.max(0, latestTime - TIME_WINDOW);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingLeft:50 }}>
      <View style={{ width: 750, height: 500, position: 'relative' }}>

      {/* This is where the background colors are created on the graph */}
      <LinearGradient
        colors={['#FFFACD', '#FFFACD', '#ADFF2F', '#ADFF2F', '#FFA07A', '#FFA07A']} 
        locations={[0, 0.3, 0.3, 0.7, 0.7, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={[styles.gradientBackground, { height: 400 }]}
      />

      {/* Set the domain and range for the chart */}
      <VictoryChart 
        height={500}
        domain={{ x: [earliestTime, earliestTime + TIME_WINDOW], y: [70, 150] }} 
        domainPadding={10}
      >

        {/* Set up the scatter points (size, color, data) for the chart */}
        <VictoryScatter
            style={{ data: { fill: "#c43a31" } }} // Color for the points
            size={4} // Size of each point
            data={averagedData}
          />

          {/* Set y axis label and spacing */}
          <VictoryAxis
            dependentAxis
            label="Glucose Rate (mg/dL)"
            style={{ 
              axisLabel: { padding: 38 },  
              tickLabels: { padding: 0 },  
            }}
          />

          {/* Set x axis label and spacing */}
          <VictoryAxis
          label="Time (HH:MM)"
          style={{ 
            axisLabel: { padding: 25 },  
            tickLabels: { padding: 5 },  
          }}
          // Space out the ticks appropriately on x axis 
          tickFormat={(tick) => {
            const hours = Math.floor(tick % 86400 / 3600);
            const minutes = Math.floor((tick % 3600) / 60);
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
         }}         
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
    width: 612, 
    height: 300, 
    zIndex: -1, // Keeps it behind the graph
  },
});

export default GlucoseGraph;