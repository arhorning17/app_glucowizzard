import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, View, Text } from 'react-native';
import RealtimeSensorChart from './RealtimeSensorChart';

// Sample sensor data simulator for demonstration
const SensorDataSimulator = ({ onDataUpdate }) => {
  useEffect(() => {
    // Generate initial data (past 3 hours)
    const initialData = generateHistoricalData();
    onDataUpdate(initialData);

    // Update data every 5 seconds
    const interval = setInterval(() => {
      // Add a new data point
      const now = new Date().getTime();
      const baseValue = 130;
      const fluctuation = 50;
      const newValue = baseValue + 
                       Math.sin(now / (40 * 60 * 1000)) * fluctuation + 
                       (Math.random() - 0.5) * 20;
      
      onDataUpdate(currentData => {
        // Keep only data from the last 3 hours
        const threeHoursAgo = now - 3 * 60 * 60 * 1000;
        const filteredData = currentData.filter(point => point.timestamp >= threeHoursAgo);
        
        // Add new point
        return [...filteredData, { timestamp: now, value: newValue }];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Generate 3 hours of historical data
  const generateHistoricalData = () => {
    const now = new Date().getTime();
    const threeHoursAgo = now - 3 * 60 * 60 * 1000;
    const data = [];
    
    // Generate data points every 5 minutes over a 3-hour period
    for (let time = threeHoursAgo; time <= now; time += 5 * 60 * 1000) {
      // Generate a value between 80 and 180 with some random fluctuation
      const baseValue = 130;
      const fluctuation = 50;
      const value = baseValue + Math.sin((time - threeHoursAgo) / (40 * 60 * 1000)) * fluctuation + 
                   (Math.random() - 0.5) * 20;
      
      data.push({
        timestamp: time,
        value: value
      });
    }
    
    return data;
  };

  return null; // This is just a logic component, no UI
};

const App = () => {
  const [sensorData, setSensorData] = useState([]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sensor Dashboard</Text>
      </View>
      
      <RealtimeSensorChart 
        data={sensorData} 
        yMin={40} 
        yMax={300} 
        title="Glucose" 
      />
      
      {/* This component simulates real-time sensor data */}
      <SensorDataSimulator onDataUpdate={setSensorData} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default App;