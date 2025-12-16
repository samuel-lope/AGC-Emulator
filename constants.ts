
import { IndicatorName, IndicatorState, Scenario } from './types';

// Reference Order: UPLINK, NO ATT, STBY, KEY REL, OPR ERR, TEMP, GIMBAL_LOCK, PROG, RESTART, TRACKER, ALT, VEL
export const INITIAL_INDICATORS: IndicatorState = {
  [IndicatorName.UPLINK_ACTY]: false,
  [IndicatorName.NO_ATT]: false,
  [IndicatorName.STBY]: true,
  [IndicatorName.KEY_REL]: false,
  [IndicatorName.OPR_ERR]: false,
  [IndicatorName.TEMP]: false,
  [IndicatorName.GIMBAL_LOCK]: false,
  [IndicatorName.PROG]: false,
  [IndicatorName.RESTART]: false,
  [IndicatorName.TRACKER]: false,
  [IndicatorName.ALT]: false,
  [IndicatorName.VEL]: false,
  [IndicatorName.COMP_ACTY]: false, // Internal use
};

export const INITIAL_PHYSICS = {
  altitude: 15000, // Starting high for P63
  velocity: -100,
  fuel: 100,
  thrust: 0,
  moonSurface: 0,
  active: false,
};

// Expanded valid inputs for validation if needed, though the emulator is permissible
export const VALID_VERBS = ['01', '03', '04', '05', '06', '11', '16', '21', '22', '23', '33', '34', '35', '37', '46', '49', '50', '69', '75', '82', '91', '99'];
export const VALID_NOUNS = ['02', '09', '14', '18', '23', '25', '29', '33', '34', '35', '36', '38', '43', '44', '50', '60', '61', '62', '63', '64', '68', '69', '73', '74', '76', '89', '94', '95'];

export const PROGRAM_CODES = {
  IDLE: '00',
  DESC_INIT: '63', // Braking Phase
  DESC_APP: '64', // Approach Phase
  DESC_TERM: '66', // Terminal Descent (Manual control)
};

export const AGC_DICTIONARY = {
  verbs: {
    "01": "Display Erasable Mem",
    "03": "Display R1 Octal",
    "04": "Display R1/R2 Octal",
    "05": "Display R1/R2/R3 Octal",
    "06": "Display Decimal",
    "11": "Monitor Erasable Mem",
    "16": "Monitor Decimal",
    "21": "Load Component 1",
    "22": "Load Component 2",
    "23": "Load Component 3",
    "33": "Proceed Without Data",
    "34": "Terminate Program",
    "35": "Lamp Test",
    "37": "Run Program",
    "46": "Select Manual Control",
    "49": "Crew Maneuver",
    "50": "Please Perform",
    "69": "Restart",
    "75": "Start Launch Control",
    "82": "Display Orbit Info",
    "91": "Display Checksum",
    "99": "Confirm Burn"
  } as Record<string, string>,
  nouns: {
    "00": "Not Applicable",
    "01": "Specify Address",
    "02": "Erasable Mem Addr",
    "09": "Alarm Codes",
    "14": "Desired Delta-V",
    "18": "IMU Angles",
    "23": "Burn Details",
    "25": "Checklist Action",
    "29": "Launch Azimuth",
    "33": "Time to Ignition",
    "34": "Time Next Event",
    "35": "Time Next Event",
    "36": "Time/Vel/Alt",
    "38": "Time Since Boot",
    "43": "Lat/Long/Alt",
    "44": "Orbit Info",
    "50": "Apo/Peri/Fuel",
    "60": "FwdVel/AltRate/Alt",
    "61": "Time-to-go/Crossrange",
    "62": "Vel/Alt/DeltaH",
    "63": "DeltaAlt/Rate/Alt",
    "64": "LPD Time/Angle",
    "68": "Landing Radar",
    "69": "Restart",
    "73": "Flight Trajectory",
    "74": "Time/Yaw/Pitch",
    "76": "Desired Vel/Crossrange",
    "89": "Landing Site",
    "94": "Orbit/Alt Info",
    "95": "Burn Details"
  } as Record<string, string>,
  programs: {
    "00": "P00: Idle",
    "01": "P01: Pre-Launch IMU Align",
    "02": "P02: Pre-Launch Setup",
    "06": "P06: Standby",
    "11": "P11: Launch Control",
    "12": "P12: Ascent to Orbit",
    "15": "P15: TLI Burn",
    "16": "P16: Lunar Orbit Insert",
    "17": "P17: Descent Orbit Insert",
    "18": "P18: Orbit Align",
    "19": "P19: Orbit Adjust",
    "32": "P32: CSI Coelliptic",
    "33": "P33: CDH Const Delta H",
    "34": "P34: TPI Transfer Init",
    "35": "P35: TPM Transfer Mid",
    "36": "P36: Rendezvous Braking",
    "40": "P40: DPS Burn",
    "41": "P41: RCS Burn",
    "42": "P42: APS Burn",
    "63": "P63: LM PDI Braking",
    "64": "P64: LM Approach",
    "65": "P65: LM Auto Landing",
    "66": "P66: LM Manual Landing",
    "68": "P68: Landing Confirm",
    "70": "P70: LM DPS Abort",
    "71": "P71: LM APS Abort"
  } as Record<string, string>
};

export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "apollo11_landing",
    name: "Apollo 11: The Eagle Landing",
    description: "Historical simulation of the Apollo 11 landing. Watch out for 1202 alarms.",
    initialState: { prog: "63", verb: "06", noun: "62", altitude: 40000, velocity: -500, fuel: 100 },
    events: [
        { trigger: 'altitude', op: '<', val: 33000, type: 'ALARM', code: '1202', handled: false },
        { trigger: 'altitude', op: '<=', val: 0, type: 'SUCCESS', msg: 'THE EAGLE HAS LANDED', handled: false }
    ]
  },
  {
    id: "manual_descent",
    name: "P66 Manual Descent",
    description: "Take control in the final phase. Don't run out of fuel.",
    initialState: { prog: "66", verb: "16", noun: "62", altitude: 3000, velocity: -20, fuel: 40 },
    events: [
        { trigger: 'fuel', op: '<=', val: 0, type: 'FAIL', msg: 'FUEL EXHAUSTED. ABORT.', handled: false },
        { trigger: 'altitude', op: '<=', val: 0, type: 'SUCCESS', msg: 'TOUCHDOWN CONFIRMED', handled: false }
    ]
  },
  {
    id: "orbit",
    name: "Lunar Orbit (Idle)",
    description: "Safe orbit. System check.",
    initialState: { prog: "00", verb: "00", noun: "00", altitude: 110000, velocity: 1600, fuel: 100 },
    events: []
  }
];
