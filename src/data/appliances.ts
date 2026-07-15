import { Appliance } from '../types';

export const DEFAULT_APPLIANCES: Appliance[] = [
  // Lighting
  { id: '1', category: 'Lighting', applianceName: 'LED Bulb', defaultWattage: 10, surgeMultiplier: 1.0 },
  { id: '1b', category: 'Lighting', applianceName: 'LED Tube Light', defaultWattage: 18, surgeMultiplier: 1.0 },
  { id: '1c', category: 'Lighting', applianceName: 'Fluorescent Tube', defaultWattage: 36, surgeMultiplier: 1.5 },
  { id: '1d', category: 'Lighting', applianceName: 'Halogen Lamp', defaultWattage: 50, surgeMultiplier: 1.0 },
  { id: '1e', category: 'Lighting', applianceName: 'Outdoor Security Light', defaultWattage: 30, surgeMultiplier: 1.0 },

  // Kitchen
  { id: '2', category: 'Kitchen', applianceName: 'Refrigerator', defaultWattage: 150, surgeMultiplier: 3.0 },
  { id: '2b', category: 'Kitchen', applianceName: 'Chest Freezer', defaultWattage: 200, surgeMultiplier: 3.0 },
  { id: '3', category: 'Kitchen', applianceName: 'Upright Freezer', defaultWattage: 250, surgeMultiplier: 3.0 },
  { id: '3b', category: 'Kitchen', applianceName: 'Deep Freezer', defaultWattage: 350, surgeMultiplier: 3.0 },
  { id: '4', category: 'Kitchen', applianceName: 'Microwave', defaultWattage: 1200, surgeMultiplier: 1.2 },
  { id: '5', category: 'Kitchen', applianceName: 'Blender', defaultWattage: 400, surgeMultiplier: 1.5 },
  { id: '6', category: 'Kitchen', applianceName: 'Electric Kettle', defaultWattage: 2000, surgeMultiplier: 1.1 },
  { id: '6b', category: 'Kitchen', applianceName: 'Rice Cooker', defaultWattage: 500, surgeMultiplier: 1.1 },
  { id: '6c', category: 'Kitchen', applianceName: 'Electric Cooker', defaultWattage: 2000, surgeMultiplier: 1.1 },
  { id: '6d', category: 'Kitchen', applianceName: 'Induction Cooker', defaultWattage: 1800, surgeMultiplier: 1.1 },
  { id: '6e', category: 'Kitchen', applianceName: 'Toaster', defaultWattage: 800, surgeMultiplier: 1.1 },

  // Living Room / Entertainment
  { id: '7', category: 'Living Room', applianceName: 'Television', defaultWattage: 120, surgeMultiplier: 1.0 },
  { id: '8', category: 'Living Room', applianceName: 'Decoder', defaultWattage: 25, surgeMultiplier: 1.0 },
  { id: '9', category: 'Living Room', applianceName: 'Wi-Fi Router', defaultWattage: 15, surgeMultiplier: 1.0 },
  { id: '10', category: 'Living Room', applianceName: 'CCTV System', defaultWattage: 80, surgeMultiplier: 1.0 },
  { id: '10b', category: 'Living Room', applianceName: 'CCTV DVR', defaultWattage: 50, surgeMultiplier: 1.0 },
  { id: '11', category: 'Living Room', applianceName: 'Sound System', defaultWattage: 150, surgeMultiplier: 1.1 },
  { id: '12', category: 'Living Room', applianceName: 'Ceiling Fan', defaultWattage: 75, surgeMultiplier: 1.2 },
  { id: '12b', category: 'Living Room', applianceName: 'Standing Fan', defaultWattage: 60, surgeMultiplier: 1.2 },
  { id: '12c', category: 'Living Room', applianceName: 'Exhaust Fan', defaultWattage: 45, surgeMultiplier: 1.2 },

  // Bedroom / Laundry
  { id: '13', category: 'Bedroom', applianceName: 'Iron', defaultWattage: 1000, surgeMultiplier: 1.5 },
  { id: '14', category: 'Bedroom', applianceName: 'Phone Charger', defaultWattage: 15, surgeMultiplier: 1.0 },
  { id: '14b', category: 'Bedroom', applianceName: 'Hair Dryer', defaultWattage: 1500, surgeMultiplier: 1.1 },

  // Office
  { id: '15', category: 'Office', applianceName: 'Laptop', defaultWattage: 65, surgeMultiplier: 1.0 },
  { id: '16', category: 'Office', applianceName: 'Desktop Computer', defaultWattage: 250, surgeMultiplier: 1.2 },
  { id: '17', category: 'Office', applianceName: 'Printer', defaultWattage: 500, surgeMultiplier: 1.5 },
  { id: '18', category: 'Office', applianceName: 'Monitor', defaultWattage: 40, surgeMultiplier: 1.0 },
  { id: '19', category: 'Office', applianceName: 'Projector', defaultWattage: 200, surgeMultiplier: 1.1 },

  // Heavy Loads / HVAC / Water
  { id: '20', category: 'Heavy Loads', applianceName: 'Washing Machine', defaultWattage: 800, surgeMultiplier: 2.0 },
  { id: '20b', category: 'Heavy Loads', applianceName: 'Water Heater', defaultWattage: 3000, surgeMultiplier: 1.1 },
  { id: '21', category: 'Heavy Loads', applianceName: 'Air Conditioner (1 HP)', defaultWattage: 750, surgeMultiplier: 2.5 },
  { id: '22', category: 'Heavy Loads', applianceName: 'Air Conditioner (1.5 HP)', defaultWattage: 1100, surgeMultiplier: 2.5 },
  { id: '23', category: 'Heavy Loads', applianceName: 'Air Conditioner (2 HP)', defaultWattage: 1500, surgeMultiplier: 2.5 },
  { id: '24', category: 'Heavy Loads', applianceName: 'Surface Pump', defaultWattage: 750, surgeMultiplier: 3.0 },
  { id: '24b', category: 'Heavy Loads', applianceName: 'Water Pump', defaultWattage: 750, surgeMultiplier: 3.0 },
  { id: '25', category: 'Heavy Loads', applianceName: 'Borehole Pump', defaultWattage: 1500, surgeMultiplier: 3.0 },
];
