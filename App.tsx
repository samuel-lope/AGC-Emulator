
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SevenSegment from './components/SevenSegment';
import IndicatorPanel from './components/IndicatorPanel';
import Keypad from './components/Keypad';
import MissionLog from './components/MissionLog';
import { DSKYState, IndicatorState, IndicatorName, PhysicsState, MissionLogEntry, InputMode, Scenario, ScenarioEvent } from './types';
import { INITIAL_INDICATORS, INITIAL_PHYSICS, PROGRAM_CODES, DEFAULT_SCENARIOS, AGC_DICTIONARY } from './constants';
import { getCapcomGuidance } from './services/geminiService';

const App: React.FC = () => {
  // --- STATE ---
  const [dsky, setDsky] = useState<DSKYState>({
    prog: '00', verb: '00', noun: '00',
    r1: '+00000', r2: '+00000', r3: '+00000',
    compActivity: false,
    prioDisplay: false,
    alarmCode: null
  });
  
  const [indicators, setIndicators] = useState<IndicatorState>(INITIAL_INDICATORS);
  const [physics, setPhysics] = useState<PhysicsState>(INITIAL_PHYSICS);
  const [flashState, setFlashState] = useState<boolean>(true); // Heartbeat for blinking lights

  const [logs, setLogs] = useState<MissionLogEntry[]>([
    { role: 'CAPCOM', message: 'SYSTEM READY. AWAITING COMMANDS.', timestamp: new Date().toLocaleTimeString('pt-BR', {hour12:false}) }
  ]);
  
  // Mission Control State
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(DEFAULT_SCENARIOS[0].id);
  const [missionStartTime, setMissionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  
  // Active Event Engine State
  const [activeEvents, setActiveEvents] = useState<ScenarioEvent[]>([]);

  // Simulation Logic State
  const [waitingForPro, setWaitingForPro] = useState<{action: string, program: string} | null>(null);

  // Input handling
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.NONE);
  const [inputBuffer, setInputBuffer] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const physicsRef = useRef<PhysicsState>(INITIAL_PHYSICS);
  const lastUpdateRef = useRef<number>(0);
  const activeEventsRef = useRef<ScenarioEvent[]>([]); // Ref for physics loop access

  // --- STORAGE & INIT ---
  useEffect(() => {
    // Load from LocalStorage on mount
    const saved = localStorage.getItem('agc_scenarios');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setScenarios(parsed);
            if (parsed.length > 0) setSelectedScenarioId(parsed[0].id);
        } catch (e) {
            console.error("Failed to load scenarios", e);
        }
    }
  }, []);

  // Sync Active Events Ref
  useEffect(() => {
      activeEventsRef.current = activeEvents;
  }, [activeEvents]);

  // --- ACTIONS ---
  const addLog = (role: 'CAPCOM' | 'ASTRONAUT', message: string) => {
    setLogs(prev => [...prev, { role, message, timestamp: new Date().toLocaleTimeString('pt-BR', {hour12:false}) }]);
    
    // Flash Uplink Acty on CAPCOM messages
    if (role === 'CAPCOM') {
        setIndicators(prev => ({ ...prev, [IndicatorName.UPLINK_ACTY]: true }));
        setTimeout(() => setIndicators(prev => ({ ...prev, [IndicatorName.UPLINK_ACTY]: false })), 400);
    }
  };

  const loadScenario = (id: string) => {
     const scenario = scenarios.find(s => s.id === id);
     if (!scenario) return;

     // Reset Physics & State
     setPhysics({ ...INITIAL_PHYSICS, ...scenario.initialState, active: false });
     setDsky({ 
         ...dsky, 
         prog: scenario.initialState.prog || '00',
         verb: scenario.initialState.verb || '00',
         noun: scenario.initialState.noun || '00',
         r1: '+00000', r2: '+00000', r3: '+00000',
         prioDisplay: false,
         alarmCode: null
     });
     setIndicators(INITIAL_INDICATORS);
     setMissionStartTime(Date.now());
     setElapsedTime(0);
     setWaitingForPro(null);
     
     // Clone events so we don't mutate the storage definition during runtime
     const eventsCopy = scenario.events ? JSON.parse(JSON.stringify(scenario.events)) : [];
     setActiveEvents(eventsCopy);

     addLog('CAPCOM', `MISSION LOADED: ${scenario.name}`);
     if (scenario.description) addLog('CAPCOM', scenario.description.substring(0, 30) + '...');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const json = JSON.parse(ev.target?.result as string);
              if (!json.id || !json.name || !json.initialState) {
                  alert("Invalid Scenario JSON format.");
                  return;
              }

              setScenarios(prev => {
                  const exists = prev.findIndex(s => s.id === json.id);
                  const newList = [...prev];
                  if (exists >= 0) newList[exists] = json;
                  else newList.push(json);
                  
                  // Save to LocalStorage
                  localStorage.setItem('agc_scenarios', JSON.stringify(newList));
                  return newList;
              });

              setSelectedScenarioId(json.id);
              addLog('CAPCOM', `SCENARIO IMPORTED: ${json.name}`);
          } catch (err) {
              alert("Error parsing JSON file.");
          }
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Flash Heartbeat (0.5s)
  useEffect(() => {
    const interval = setInterval(() => {
        setFlashState(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Timer Loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (missionStartTime) {
        interval = setInterval(() => {
            const now = Date.now();
            const diff = Math.floor((now - missionStartTime) / 1000);
            setElapsedTime(diff);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [missionStartTime]);

  const formatMissionTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `GET ${h}:${m}:${s}`;
  };

  const flashCompActivity = () => {
    setIndicators(prev => ({ ...prev, [IndicatorName.COMP_ACTY]: true }));
    setTimeout(() => {
        setIndicators(prev => ({ ...prev, [IndicatorName.COMP_ACTY]: false }));
    }, 100);
  };

  // --- PHYSICS & ALARM LOGIC ---
  useEffect(() => { physicsRef.current = physics; }, [physics]);

  const triggerAlarm = (code: string) => {
      setDsky(prev => ({
          ...prev,
          prioDisplay: true,
          alarmCode: code,
          // When alarm triggers, it hijacks display to V05 N09
          verb: '05',
          noun: '09',
          r1: code,
          r2: '00000',
          r3: '00000'
      }));
      setIndicators(prev => ({ 
          ...prev, 
          [IndicatorName.OPR_ERR]: true, 
          [IndicatorName.PROG]: true 
      }));
  };

  const checkAlarms = (p: PhysicsState) => {
      // 1. Built-in Simulation Logic (Default Alarms)
      if (p.active && p.altitude < 3000 && p.velocity < -80 && !dsky.alarmCode) {
          triggerAlarm('01202');
          addLog('CAPCOM', 'ALARM 1202 DETECTED. EXEC OVERFLOW.');
      }

      // Check Program State for Static Indicators
      const isLandingProg = ['63', '64', '66'].includes(dsky.prog);
      
      setIndicators(prev => {
        const next = { ...prev };
        next[IndicatorName.ALT] = isLandingProg;
        if (p.fuel < 10 && p.active) {
            next[IndicatorName.VEL] = true; 
        } else {
            next[IndicatorName.VEL] = isLandingProg;
        }
        return next;
      });
  };

  const formatRegister = (val: number, type: 'vel' | 'alt' | 'fuel' | 'time') => {
      if (type === 'vel') {
          const v = Math.abs(val).toFixed(0);
          return (val >= 0 ? '+' : '-') + v.padStart(5, '0');
      }
      if (type === 'alt') {
          const v = (val / 10).toFixed(0);
          return '+' + v.padStart(5, '0');
      }
      if (type === 'fuel') {
          const v = val.toFixed(0);
          return '+' + v.padStart(5, '0');
      }
      return '+00000';
  };

  const updatePhysics = useCallback((deltaTime: number) => {
    const current = physicsRef.current;
    
    // Physics Calc
    let newThrust = current.thrust;
    if (current.fuel <= 0 && current.thrust > 0) newThrust = 0;

    const gravity = 1.62; 
    const thrustPower = 45000; 
    const mass = 15000; 
    const thrustAccel = (newThrust / 100) * (thrustPower / mass);
    
    const newVelocity = current.velocity + (thrustAccel - gravity) * deltaTime;
    let newAltitude = current.altitude + newVelocity * deltaTime;
    const newFuel = Math.max(0, current.fuel - (0.5 * (newThrust / 100) * deltaTime));

    let isActive = current.active;
    
    // --- EVENT ENGINE PROCESSING ---
    const currentEvents = activeEventsRef.current;
    if (currentEvents.length > 0 && isActive) {
        let eventsModified = false;
        
        currentEvents.forEach(evt => {
            if (evt.handled) return;

            const val = evt.trigger === 'altitude' ? newAltitude : 
                        evt.trigger === 'velocity' ? newVelocity : newFuel;

            let triggered = false;
            if (evt.op === '<' && val < evt.val) triggered = true;
            if (evt.op === '<=' && val <= evt.val) triggered = true;
            if (evt.op === '>' && val > evt.val) triggered = true;
            if (evt.op === '>=' && val >= evt.val) triggered = true;

            if (triggered) {
                evt.handled = true;
                eventsModified = true;

                if (evt.type === 'ALARM' && evt.code) {
                    triggerAlarm(evt.code);
                    addLog('CAPCOM', `ALARM ${evt.code}. ${evt.msg || 'SYSTEM ERROR'}`);
                } else if (evt.type === 'SUCCESS') {
                    isActive = false;
                    addLog('CAPCOM', evt.msg || 'MISSION SUCCESS');
                    setIndicators(prev => ({ ...prev, [IndicatorName.UPLINK_ACTY]: true }));
                } else if (evt.type === 'FAIL') {
                    isActive = false;
                    addLog('CAPCOM', evt.msg || 'MISSION FAILURE');
                    setIndicators(prev => ({ ...prev, [IndicatorName.OPR_ERR]: true }));
                }
            }
        });

        if (eventsModified) {
            setActiveEvents([...currentEvents]);
        }
    }

    // Default ground collision
    if (isActive) {
        if (newAltitude <= 0) {
            newAltitude = 0;
            isActive = false;
            if (Math.abs(newVelocity) > 5) {
                addLog('CAPCOM', `CRASH. VEL: ${newVelocity.toFixed(1)} M/S`);
                setIndicators(prev => ({ ...prev, [IndicatorName.OPR_ERR]: true }));
            } else {
                addLog('CAPCOM', `TOUCHDOWN. ENGINE STOP.`);
                setIndicators(prev => ({ ...prev, [IndicatorName.UPLINK_ACTY]: true }));
            }
        }
    }

    const nextPhysics = { ...current, altitude: newAltitude, velocity: newVelocity, fuel: newFuel, thrust: newThrust, active: isActive };
    setPhysics(nextPhysics);

    if (isActive) checkAlarms(nextPhysics);

    // Update DSKY Registers if NOT in Priority Display (Alarm) mode
    setDsky(prev => {
        if (prev.prioDisplay) return prev; 
        
        // Update registers for V16 (Monitor) and V06 (Display)
        // V06 is typically static in real AGC, but we update for gameplay feedback
        if (prev.verb !== '16' && prev.verb !== '06') return prev; 

        // Common formatters
        const velStr = formatRegister(newVelocity, 'vel');
        const altStr = formatRegister(newAltitude, 'alt');
        const fuelStr = formatRegister(newFuel, 'fuel');
        const thrustStr = formatRegister(newThrust, 'fuel'); // Reusing fuel format for integer thrust
        const timeStr = Math.floor(elapsedTime % 100000).toString().padStart(5, '0');

        switch (prev.noun) {
            case '36': // Time / Vel / Alt
                return { ...prev, r1: '+' + timeStr, r2: velStr, r3: altStr };
            
            case '62': // Vel / Alt / Delta H (Custom Mapped: Vel / Fuel / Alt)
                // R2 mapped to Fuel for critical mission monitoring
                return { ...prev, r1: velStr, r2: fuelStr, r3: altStr };

            case '60': // FwdVel / AltRate / Alt
                 // R2 is AltRate (Velocity)
                return { ...prev, r1: '+00000', r2: velStr, r3: altStr };

            case '68': // Landing Radar: Range / Time / Vel
                // R1: Range (Alt), R2: Time (Mock), R3: Vel
                return { ...prev, r1: altStr, r2: '+00000', r3: velStr };
            
            case '50': // Apo / Peri / Fuel
                return { ...prev, r1: '+00100', r2: '+00010', r3: fuelStr };
                
            case '43': // Lat / Long / Alt
                return { ...prev, r1: '+00000', r2: '+00000', r3: altStr };

            default:
                // Keep previous values if Noun not explicitly monitored
                return prev;
        }
    });

  }, [elapsedTime, dsky.prog, dsky.alarmCode]); 

  useEffect(() => {
    let frameId: number;
    const loop = (time: number) => {
      if (lastUpdateRef.current === 0) lastUpdateRef.current = time;
      const dt = (time - lastUpdateRef.current) / 1000;
      if (dt > 0.05) { updatePhysics(dt); lastUpdateRef.current = time; }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [updatePhysics]);


  // --- COMMANDS ---
  const executeCommand = async (verb: string, noun: string) => {
    flashCompActivity();
    
    const vDesc = AGC_DICTIONARY.verbs[verb] || "UNK";
    const nDesc = AGC_DICTIONARY.nouns[noun] || "UNK";
    
    // Ignore log for V06/V16 updates, only log commands
    if (verb !== '16') {
        addLog('ASTRONAUT', `CMD: ${vDesc} / ${nDesc}`);
    }

    // V37: Prog Change
    if (verb === '37') {
         if (Object.values(PROGRAM_CODES).includes(noun)) {
             setDsky(prev => ({ ...prev, prog: noun }));
             addLog('CAPCOM', `PROG CHANGE: P${noun}`);
             
             // LOGIC FOR PROGRAM CHANGES
             if (noun === '63') {
                 // P63: Braking Phase. Requires PRO to Ignite.
                 // Display V50 N25 (Please Perform) R1: 00063
                 setDsky(prev => ({
                     ...prev,
                     verb: '50',
                     noun: '25',
                     r1: '+00063',
                     r2: '+00000',
                     r3: '+00000'
                 }));
                 setWaitingForPro({ action: 'IGNITION', program: '63' });
                 addLog('CAPCOM', 'P63 SELECTED. PLEASE PERFORM (PRO).');

             } else if (noun === '66') {
                 // P66: Manual. If engine off, ask for PRO. If on, just switch.
                 if (physics.active) {
                     addLog('CAPCOM', 'P66 MANUAL ENABLED. YOU HAVE CONTROL.');
                 } else {
                     setDsky(prev => ({
                        ...prev,
                        verb: '50',
                        noun: '25',
                        r1: '+00066',
                        r2: '+00000',
                        r3: '+00000'
                    }));
                    setWaitingForPro({ action: 'IGNITION', program: '66' });
                    addLog('CAPCOM', 'P66 SELECTED. PLEASE PERFORM (PRO).');
                 }

             } else if (noun === '00') {
                 // Idle: Cut Engine
                 setPhysics(prev => ({ ...prev, active: false, thrust: 0 }));
                 setWaitingForPro(null);
                 addLog('CAPCOM', 'P00 IDLE. ENGINE OFF.');
             }

         } else {
             setIndicators(prev => ({ ...prev, [IndicatorName.OPR_ERR]: true }));
         }
         return;
    }

    if (verb === '35') {
        // Lamp Test
        const allOn: IndicatorState = {} as any;
        Object.keys(INITIAL_INDICATORS).forEach(k => allOn[k as IndicatorName] = true);
        setIndicators(allOn);
        setDsky(prev => ({ ...prev, r1: '+88888', r2: '+88888', r3: '+88888' }));
        setTimeout(() => {
            setIndicators(INITIAL_INDICATORS);
            setDsky(prev => ({ ...prev, r1: '+00000', r2: '+00000', r3: '+00000' }));
        }, 1500);
        return;
    }

    // AI Fallback
    const aiResponse = await getCapcomGuidance(physics, dsky.prog, verb, noun);
    addLog('CAPCOM', aiResponse);
  };

  // --- KEYPAD ---
  const handleKeyPress = (key: string) => {
    
    // PROCEED KEY LOGIC
    if (key === 'PRO') {
        flashCompActivity();
        
        // Clear Alarm if active
        if (dsky.alarmCode) {
            // Usually RSET clears alarm, PRO might accept it? 
            // In emu, RSET is cleaner. Let's make PRO ignore alarm or do nothing.
            return;
        }

        if (waitingForPro) {
            if (waitingForPro.action === 'IGNITION') {
                const isP63 = waitingForPro.program === '63';
                const initialThrust = isP63 ? 10 : 0;
                setPhysics(p => ({ ...p, active: true, thrust: initialThrust }));
                addLog('CAPCOM', isP63 ? 'IGNITION. AUTOMATIC BRAKING.' : 'IGNITION. MANUAL CONTROL.');
                
                // Switch to Monitor Flight Data automatically
                setDsky(prev => ({
                    ...prev,
                    verb: '16',
                    noun: '63', // Switch to monitor
                    r1: formatRegister(physics.velocity, 'vel'),
                    r2: formatRegister(physics.fuel, 'fuel'),
                    r3: formatRegister(physics.altitude, 'alt')
                }));
                // Force command execution to switch display logic
                executeCommand('16', '62'); 
            }
            setWaitingForPro(null);
        } else {
            // General PRO: just acknowledge (maybe AI guidance?)
            addLog('ASTRONAUT', 'PROCEED');
        }
        return;
    }

    if (key === 'RSET') {
        // Clear Alarms
        setDsky(prev => ({ 
            ...prev, 
            prioDisplay: false, 
            alarmCode: null, 
            verb: '16', 
            noun: '62' 
        }));
        setIndicators(prev => ({ 
            ...prev, 
            [IndicatorName.OPR_ERR]: false, 
            [IndicatorName.PROG]: false,
            [IndicatorName.VEL]: false 
        }));
        addLog('ASTRONAUT', 'RSET');
        return;
    }

    if (key === 'KEY REL') {
        setInputMode(InputMode.NONE);
        setInputBuffer('');
        addLog('ASTRONAUT', 'KEY REL');
        return;
    }

    // ALARM LOCK: Block all other inputs if alarm is active
    if (dsky.prioDisplay) {
        return;
    }

    setIndicators(prev => ({ ...prev, [IndicatorName.OPR_ERR]: false }));

    if (key === 'VERB') { setInputMode(InputMode.VERB); setInputBuffer(''); setDsky(p => ({ ...p, verb: '' })); return; }
    if (key === 'NOUN') { setInputMode(InputMode.NOUN); setInputBuffer(''); setDsky(p => ({ ...p, noun: '' })); return; }
    if (key === 'CLR') { setInputBuffer(''); setInputMode(InputMode.NONE); return; }
    
    if (key === 'ENTR') {
       if (inputMode === InputMode.VERB) {
           const v = inputBuffer.padStart(2, '0');
           setDsky(p => ({ ...p, verb: v }));
           if (dsky.noun !== '00') executeCommand(v, dsky.noun);
       } else if (inputMode === InputMode.NOUN) {
           const n = inputBuffer.padStart(2, '0');
           setDsky(p => ({ ...p, noun: n }));
           if (dsky.verb !== '00') executeCommand(dsky.verb, n);
       } else {
           executeCommand(dsky.verb, dsky.noun);
       }
       setInputMode(InputMode.NONE);
       return;
    }

    if (!isNaN(parseInt(key))) {
       if (inputMode === InputMode.VERB || inputMode === InputMode.NOUN) {
           if (inputBuffer.length < 2) {
               const next = inputBuffer + key;
               setInputBuffer(next);
               if (inputMode === InputMode.VERB) setDsky(p => ({ ...p, verb: next }));
               if (inputMode === InputMode.NOUN) setDsky(p => ({ ...p, noun: next }));
           }
       }
    }

    if (key === '9') setPhysics(p => ({ ...p, thrust: Math.min(100, p.thrust + 5) }));
    if (key === '6') setPhysics(p => ({ ...p, thrust: Math.max(0, p.thrust - 5) }));
    if (key === 'LAMP') executeCommand('35', '00');
  };

  const getVerbDescription = () => {
    return AGC_DICTIONARY.verbs[dsky.verb] || '';
  }
  const getNounDescription = () => {
    return AGC_DICTIONARY.nouns[dsky.noun] || '';
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 md:p-12">
      
      <div className="flex flex-col xl:flex-row gap-8 xl:gap-16 items-center xl:items-start justify-center w-full max-w-[1400px]">

        {/* LEFT: DSKY */}
        <div className="flex-shrink-0 w-full max-w-[480px]">
            <div className="bg-[#2b2b2b] border-4 border-[#444] rounded p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
                
                {/* Screws */}
                <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-neutral-600 border border-neutral-800 shadow-inner"></div>
                <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-neutral-600 border border-neutral-800 shadow-inner"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-neutral-600 border border-neutral-800 shadow-inner"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-neutral-600 border border-neutral-800 shadow-inner"></div>

                <div className="bg-[#555] p-4 border border-[#777] grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-4">
                    
                    <div className="bg-black p-2 border-2 border-[#333] flex flex-col gap-1 shadow-inner relative">
                        <IndicatorPanel indicators={indicators} flashState={flashState} />

                        <div className="flex justify-between items-center bg-[#0a0a0a] px-2 h-10 mb-1">
                            <span className="text-[#aaa] text-[11px] font-bold">COMP ACTY</span>
                            <div className={`w-3 h-3 rounded-full transition-colors duration-100 ${indicators[IndicatorName.COMP_ACTY] ? 'bg-[#ffcc00] shadow-[0_0_8px_#ffcc00]' : 'bg-[#1c331c]'}`}></div>
                        </div>

                        <SevenSegment label="PROG" value={dsky.prog} />
                        
                        <div className="flex justify-between items-center bg-[#0a0a0a] px-2 h-[38px] mb-[6px]">
                            <span className="text-[#aaa] text-[11px] w-8 font-bold">VERB</span>
                            <span className={`font-['VT323'] text-[#4aff4a] text-[32px] leading-none dsky-digit ${dsky.verb === '' && flashState ? 'opacity-0' : 'opacity-100'}`}>
                                {dsky.verb.padStart(2,'0')}
                            </span>
                            <span className="text-[#aaa] text-[11px] w-8 font-bold text-right">NOUN</span>
                            <span className={`font-['VT323'] text-[#4aff4a] text-[32px] leading-none dsky-digit ${dsky.noun === '' && flashState ? 'opacity-0' : 'opacity-100'}`}>
                                {dsky.noun.padStart(2,'0')}
                            </span>
                        </div>

                        <SevenSegment label="R1" value={dsky.r1} digits={5} showSign blinking={dsky.prioDisplay && flashState} />
                        <SevenSegment label="R2" value={dsky.r2} digits={5} showSign blinking={dsky.prioDisplay && flashState} />
                        <SevenSegment label="R3" value={dsky.r3} digits={5} showSign blinking={dsky.prioDisplay && flashState} />

                        <div className="mt-2 border-t border-[#333] pt-1 min-h-[30px] flex flex-col justify-end text-[12px] text-[#00aa00] font-mono leading-tight opacity-80">
                           <div className="flex items-center">
                               <span className="w-4 text-[#555] font-bold mr-1">V:</span>
                               <span className="uppercase tracking-wide">{getVerbDescription()}</span>
                           </div>
                           <div className="flex items-center">
                               <span className="w-4 text-[#555] font-bold mr-1">N:</span>
                               <span className="uppercase tracking-wide">{getNounDescription()}</span>
                           </div>
                        </div>

                    </div>

                    <div className="flex flex-col justify-end">
                        <Keypad onKeyPress={handleKeyPress} />
                    </div>

                </div>
            </div>
        </div>

        {/* RIGHT: CONTROLS */}
        <div className="flex flex-col w-full max-w-[500px] gap-6">
             <div className="border-b border-gray-700 pb-2 flex flex-col">
                 <div className="flex justify-between items-start">
                    <h1 className="text-4xl text-white font-bold tracking-widest font-['Share_Tech_Mono']" style={{textShadow: '0 0 10px rgba(74, 255, 74, 0.4)'}}>AGC EMULATOR</h1>
                 </div>
                 <div className="flex justify-between items-end mt-1">
                    <div className="text-xs text-gray-500 tracking-[0.3em]">BLOCK II • GUIDANCE SYSTEM</div>
                    <div className="text-xl text-[#ffcc00] font-mono font-bold tracking-widest drop-shadow-[0_0_5px_rgba(255,204,0,0.5)]">
                        {missionStartTime ? formatMissionTime(elapsedTime) : 'GET 00:00:00'}
                    </div>
                 </div>
             </div>

             <div className="bg-[#1a1a1a] border border-[#333] p-4 shadow-xl">
                 <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-[#4aff4a] font-bold tracking-widest uppercase">Mission Profile</label>
                    <div className="h-1 w-16 bg-[#333]"></div>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-0">
                    <select 
                        value={selectedScenarioId} 
                        onChange={(e) => setSelectedScenarioId(e.target.value)}
                        className="flex-grow bg-black text-[#4aff4a] border border-[#333] p-3 font-mono text-sm outline-none focus:border-[#4aff4a] transition-colors appearance-none rounded-none"
                    >
                        {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button 
                        onClick={() => loadScenario(selectedScenarioId)}
                        className="bg-[#004400] hover:bg-[#006600] text-white px-6 py-3 text-sm font-bold tracking-wider border-t sm:border-t border-b border-r border-[#333] sm:border-l-0 transition-colors uppercase"
                    >
                        INIT
                    </button>
                    
                    {/* HIDDEN INPUT & IMPORT BUTTON */}
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept=".json"
                        onChange={handleFileUpload}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#333] hover:bg-[#444] text-[#aaa] px-4 py-3 text-sm font-bold border-t border-b border-r border-[#333] transition-colors"
                        title="Import JSON Scenario"
                    >
                        (+)
                    </button>
                 </div>
             </div>

             <div className="flex-grow">
                 <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-[#4aff4a] font-bold tracking-widest uppercase">Data Link</span>
                    <span className="text-[10px] text-green-500 font-mono animate-pulse">● SIGNAL LOCKED</span>
                 </div>
                 <MissionLog logs={logs} />
             </div>

             {/* REFERENCE CHEAT SHEET */}
             <div className="bg-[#1a1a1a] border border-[#333] p-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-[#4aff4a] font-bold tracking-widest uppercase">Quick Reference</label>
                    <div className="h-1 w-16 bg-[#333]"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                        <div className="text-gray-500 mb-1 font-bold">MONITORS</div>
                        <div className="flex justify-between mb-1"><span className="text-[#4aff4a]">V16 N62</span> <span className="text-gray-400">Flight Data</span></div>
                        <div className="flex justify-between mb-1"><span className="text-[#4aff4a]">V16 N68</span> <span className="text-gray-400">Landing Radar</span></div>
                    </div>
                    <div>
                        <div className="text-gray-500 mb-1 font-bold">PROGRAMS (V37)</div>
                        <div className="flex justify-between mb-1"><span className="text-[#4aff4a]">N63</span> <span className="text-gray-400">Braking</span></div>
                        <div className="flex justify-between mb-1"><span className="text-[#4aff4a]">N66</span> <span className="text-gray-400">Manual Desc</span></div>
                        <div className="flex justify-between mb-1"><span className="text-[#4aff4a]">PRO</span> <span className="text-gray-400">Confirm/Ignite</span></div>
                    </div>
                </div>
                <div className="mt-2 pt-2 border-t border-[#333] text-[10px] text-gray-500">
                    KEYS: [9] THRUST+ | [6] THRUST- | [RSET] ALARM CLEAR
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default App;
