//This is used to help build each screen with any parameters it might need
export type RootStackParamList = {
    Profile: undefined;
    Graph: { heartRateHistory: number[] }; 
    Bluetooth: undefined;
    CGM: undefined;
    OldGraphs: undefined;
  };
  