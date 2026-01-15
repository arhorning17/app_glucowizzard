import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryScatter, VictoryArea } from 'victory-native';
import { format, subHours } from 'date-fns';

const RealtimeSensorChart = ({ data = [], yMin = 40, yMax = 300, title = "Sensor Output" }) => {
  const [chartData, setChartData] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Generate time labels for x-axis (3-hour period)
  const getTimeLabels = () => {
    const now = new Date();
    return [
      format(subHours(now, 3), 'ha'),
      format(subHours(now, 2), 'ha'),
      format(subHours(now, 1), 'ha'),
      format(now, 'ha')
    ];
  };

  // Format the domain for x-axis (in milliseconds)
  const getTimeDomain = () => {
    const now = currentTime.getTime();
    return [now - 3 * 60 * 60 * 1000, now]; // 3 hours in milliseconds
  };

  // Update data and current time
  useEffect(() => {
    // If no external data is provided, generate mock data
    if (data.length === 0) {
      const mockData = generateMockData();
      setChartData(mockData);
    } else {
      setChartData(data);
    }

    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      
      // If using mock data, update it to simulate real-time data
      if (data.length === 0) {
        const mockData = generateMockData();
        setChartData(mockData);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  // Generate mock data for demonstration purposes
  const generateMockData = () => {
    const now = new Date().getTime();
    const threeHoursAgo = now - 3 * 60 * 60 * 1000;
    const mockData = [];
    
    // Generate data points every 5 minutes over a 3-hour period
    for (let time = threeHoursAgo; time <= now; time += 5 * 60 * 1000) {
      // Generate a value between 80 and 180 with some random fluctuation
      const baseValue = 130;
      const fluctuation = 50;
      const value = baseValue + Math.sin((time - threeHoursAgo) / (40 * 60 * 1000)) * fluctuation + 
                    (Math.random() - 0.5) * 20;
      
      mockData.push({
        timestamp: time,
        value: value
      });
    }
    
    return mockData;
  };

  // Get the most recent value
  const getCurrentValue = () => {
    if (chartData.length === 0) return "N/A";
    const latestPoint = chartData[chartData.length - 1];
    return Math.round(latestPoint.value);
  };

  const getTimeLabelsFormatted = () => {
    const labels = getTimeLabels();
    // Convert labels like "8AM" to just "8AM" (remove minutes)
    return labels.map(label => label);
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <VictoryChart
          width={Dimensions.get('window').width - 20}
          height={200}
          padding={{ top: 10, bottom: 30, left: 50, right: 20 }}
          domain={{ y: [yMin, yMax], x: getTimeDomain() }}
        >
          {/* Background color bands */}
          <VictoryArea
            data={[
              { x: getTimeDomain()[0], y: yMax },
              { x: getTimeDomain()[1], y: yMax }
            ]}
            y0={() => yMin}
            style={{
              data: { fill: '#f9f9f0', opacity: 0.8 }
            }}
          />
          <VictoryArea
            data={[
              { x: getTimeDomain()[0], y: 200 },
              { x: getTimeDomain()[1], y: 200 }
            ]}
            y0={() => yMin}
            style={{
              data: { fill: '#f0f0f0', opacity: 0.8 }
            }}
          />
          <VictoryArea
            data={[
              { x: getTimeDomain()[0], y: 100 },
              { x: getTimeDomain()[1], y: 100 }
            ]}
            y0={() => yMin}
            style={{
              data: { fill: '#f9f0f0', opacity: 0.8 }
            }}
          />
          
          {/* Y-axis with gridlines */}
          <VictoryAxis
            dependentAxis
            tickValues={[yMin, 100, 200, yMax]}
            style={{
              axis: { stroke: '#ccc' },
              tickLabels: { fontSize: 10, padding: 5 },
              grid: { stroke: '#ccc', strokeWidth: 0.5 }
            }}
          />
          
          {/* X-axis with time labels */}
          <VictoryAxis
            tickValues={getTimeLabels().map((_, i) => getTimeDomain()[0] + i * 60 * 60 * 1000)}
            tickFormat={getTimeLabelsFormatted()}
            style={{
              axis: { stroke: '#ccc' },
              tickLabels: { fontSize: 10, padding: 5 }
            }}
          />
          
          {/* The line chart */}
          <VictoryLine
            data={chartData}
            x="timestamp"
            y="value"
            style={{
              data: { stroke: 'black', strokeWidth: 1.5 }
            }}
            interpolation="monotoneX"
          />
          
          {/* Dots on the line */}
          <VictoryScatter
            data={chartData.filter((_, i) => i % 5 === 0)} // Show dots at intervals
            x="timestamp"
            y="value"
            size={3}
            style={{
              data: { fill: 'black' }
            }}
          />
          
          {/* Current value dot */}
          <VictoryScatter
            data={chartData.length > 0 ? [chartData[chartData.length - 1]] : []}
            x="timestamp"
            y="value"
            size={5}
            style={{
              data: { fill: 'white', stroke: 'black', strokeWidth: 1.5 }
            }}
          />
        </VictoryChart>
      </View>
      
      {/* Current value display */}
      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>{title}</Text>
        <Text style={styles.currentValue}>{getCurrentValue()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    margin: 10,
  },
  chartContainer: {
    alignItems: 'center',
  },
  currentValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -15,
    paddingHorizontal: 10,
  },
  currentValueLabel: {
    fontSize: 14,
    color: '#666',
  },
  currentValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RealtimeSensorChart;