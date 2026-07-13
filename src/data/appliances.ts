import { Appliance } from '../types';

export const DEFAULT_APPLIANCES: Appliance[] = [
  // Lighting
  { id: '1', category: 'Lighting', applianceName: 'LED Bulb', defaultWattage: 10, surgeMultiplier: 1.0 },
  
  // Kitchen
  { id: '2', category: 'Kitchen', applianceName: 'Refrigerator', defaultWattage: 250, surgeMultiplier: 3.0 },
  { id: '3', category: 'Kitchen', applianceName: 'Deep Freezer', defaultWattage: 350, surgeMultiplier: 3.0 },
  { id: '4', category: 'Kitchen', applianceName: 'Microwave', defaultWattage: 1200, surgeMultiplier: 1.2 },
  { id: '5', category: 'Kitchen', applianceName: 'Blender', defaultWattage: 400, surgeMultiplier: 1.5 },
  { id: '6', category: 'Kitchen', applianceName: 'Electric Kettle', defaultWattage: 2000, surgeMultiplier: 1.1 },
  
  // Living Room
  { id: '7', category: 'Living Room', applianceName: 'Television', defaultWattage: 120, surgeMultiplier: 1.0 },
  { id: '8', category: 'Living Room', applianceName: 'Decoder', defaultWattage: 25, surgeMultiplier: 1.0 },
  { id: '9', category: 'Living Room', applianceName: 'WiFi Router', defaultWattage: 15, surgeMultiplier: 1.0 },
  { id: '10', category: 'Living Room', applianceName: 'CCTV DVR', defaultWattage: 50, surgeMultiplier: 1.0 },
  { id: '11', category: 'Living Room', applianceName: 'Sound System', defaultWattage: 150, surgeMultiplier: 1.1 },
  { id: '12', category: 'Living Room', applianceName: 'Ceiling Fan', defaultWattage: 75, surgeMultiplier: 1.2 },

  // Bedroom
  { id: '13', category: 'Bedroom', applianceName: 'Iron', defaultWattage: 1000, surgeMultiplier: 1.5 },
  { id: '14', category: 'Bedroom', applianceName: 'Phone Charger', defaultWattage: 15, surgeMultiplier: 1.0 },

  // Office
  { id: '15', category: 'Office', applianceName: 'Laptop', defaultWattage: 65, surgeMultiplier: 1.0 },
  { id: '16', category: 'Office', applianceName: 'Desktop Computer', defaultWattage: 250, surgeMultiplier: 1.2 },
  { id: '17', category: 'Office', applianceName: 'Printer', defaultWattage: 500, surgeMultiplier: 1.5 },
  { id: '18', category: 'Office', applianceName: 'Monitor', defaultWattage: 40, surgeMultiplier: 1.0 },
  { id: '19', category: 'Office', applianceName: 'Projector', defaultWattage: 200, surgeMultiplier: 1.1 },

  // Heavy Loads
  { id: '20', category: 'Heavy Loads', applianceName: 'Washing Machine', defaultWattage: 800, surgeMultiplier: 2.0 },
  { id: '21', category: 'Heavy Loads', applianceName: 'Air Conditioner (1 HP)', defaultWattage: 750, surgeMultiplier: 2.5 },
  { id: '22', category: 'Heavy Loads', applianceName: 'Air Conditioner (1.5 HP)', defaultWattage: 1100, surgeMultiplier: 2.5 },
  { id: '23', category: 'Heavy Loads', applianceName: 'Air Conditioner (2 HP)', defaultWattage: 1500, surgeMultiplier: 2.5 },
  { id: '24', category: 'Heavy Loads', applianceName: 'Water Pump', defaultWattage: 750, surgeMultiplier: 3.0 },
  { id: '25', category: 'Heavy Loads', applianceName: 'Borehole Pump', defaultWattage: 1500, surgeMultiplier: 3.0 },
];
