
// Status Lights on the DSKY
export enum IndicatorName {
  COMP_ACTY = 'COMP_ACTY',
  UPLINK_ACTY = 'UPLINK_ACTY',
  TEMP = 'TEMP',
  NO_ATT = 'NO_ATT',
  GIMBAL_LOCK = 'GIMBAL_LOCK',
  PROG = 'PROG',
  RESTART = 'RESTART',
  TRACKER = 'TRACKER',
  ALT = 'ALT',
  VEL = 'VEL',
  OPR_ERR = 'OPR_ERR',
  KEY_REL = 'KEY_REL',
  STBY = 'STBY',
}

export type IndicatorState = Record<IndicatorName, boolean>;

export interface DSKYState {
  prog: string;
  verb: string;
  noun: string;
  r1: string; // Register 1 (5 digits + sign)
  r2: string; // Register 2 (5 digits + sign)
  r3: string; // Register 3 (5 digits + sign)
  compActivity: boolean;
  prioDisplay: boolean; // If true, registers are locked to an alarm or priority message
  alarmCode: string | null; // e.g., '01202'
}

export interface PhysicsState {
  altitude: number; // meters
  velocity: number; // m/s (negative is down)
  fuel: number; // percentage
  thrust: number; // 0-100
  moonSurface: number; // meters (0)
  active: boolean; // is physics running
}

export interface MissionLogEntry {
  role: 'CAPCOM' | 'ASTRONAUT';
  message: string;
  timestamp: string;
}

export enum InputMode {
  NONE = 'NONE',
  VERB = 'VERB',
  NOUN = 'NOUN',
  ENTER_DATA = 'ENTER_DATA' // Not fully implemented in this simplified version, but reserved
}

// --- NEW SCENARIO TYPES ---

export interface ScenarioEvent {
  trigger: 'altitude' | 'fuel' | 'velocity';
  op: '<' | '<=' | '>' | '>=';
  val: number;
  type: 'ALARM' | 'SUCCESS' | 'FAIL';
  code?: string; // for ALARM
  msg?: string; // for SUCCESS/FAIL
  handled?: boolean; // runtime state
}

export interface ScenarioInitialState {
  prog?: string;
  verb?: string;
  noun?: string;
  altitude: number;
  velocity: number;
  fuel: number;
  missionTime?: number;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  initialState: ScenarioInitialState;
  events?: ScenarioEvent[];
}
