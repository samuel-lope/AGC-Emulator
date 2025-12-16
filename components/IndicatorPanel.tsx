import React from 'react';
import { IndicatorState, IndicatorName } from '../types';

interface IndicatorPanelProps {
  indicators: IndicatorState;
  flashState: boolean; // Global flash heartbeat
}

const IndicatorPanel: React.FC<IndicatorPanelProps> = ({ indicators, flashState }) => {
  
  const render = (name: IndicatorName, label: string, type: 'yellow'|'red'|'white' = 'yellow', shouldFlash = false) => {
      const isOn = indicators[name];
      // If isOn is true, and shouldFlash is true, we toggle visibility based on flashState.
      // If shouldFlash is false, we just show it if isOn is true.
      const visible = isOn && (!shouldFlash || flashState);

      let onClass = 'bg-[#ffcc00] text-black shadow-[0_0_8px_#ffcc00]';
      if (type === 'red') onClass = 'bg-[#ff3333] text-white shadow-[0_0_8px_#ff3333]';
      if (type === 'white') onClass = 'bg-white text-black shadow-[0_0_8px_white]';

      return (
           <div className={`
              flex items-center justify-center text-center text-[10px] font-bold leading-none border border-[#222] h-8 transition-colors duration-75
              ${visible ? onClass : 'bg-[#1a1500] text-[rgba(255,204,0,0.15)]'}
           `}>
               {label}
           </div>
      )
  }

  // Logic to determine which specific lights should blink based on context would ideally be passed in,
  // but for this emulator, we can infer some standard behaviors:
  // - OPR ERR usually flashes if there's an alarm.
  // - PROG flashes on major mode change request (not implemented deep enough here).
  // - VEL/ALT flash on limit checks.

  return (
      <div className="grid grid-cols-2 gap-[3px] mb-2 w-full">
           {render(IndicatorName.UPLINK_ACTY, 'UPLINK ACTY')}
           {render(IndicatorName.NO_ATT, 'NO ATT')}
           {render(IndicatorName.STBY, 'STBY')}
           {render(IndicatorName.KEY_REL, 'KEY REL')}
           
           {/* OPR ERR often flashes on alarms */}
           {render(IndicatorName.OPR_ERR, 'OPR ERR', 'yellow', indicators[IndicatorName.OPR_ERR])} 
           
           {render(IndicatorName.TEMP, 'TEMP')}
           
           {render(IndicatorName.GIMBAL_LOCK, 'GIMBAL LOCK', 'red')}
           
           {/* PROG flashes during major alarms 1201/1202 */}
           {render(IndicatorName.PROG, 'PROG', 'red', indicators[IndicatorName.PROG])} 
           
           {render(IndicatorName.RESTART, 'RESTART', 'white')}
           {render(IndicatorName.TRACKER, 'TRACKER', 'white')}
           
           {/* ALT/VEL flash on low fuel or altitude warnings */}
           {render(IndicatorName.ALT, 'ALT', 'white', indicators[IndicatorName.ALT])}
           {render(IndicatorName.VEL, 'VEL', 'white', indicators[IndicatorName.VEL])}
      </div>
  )
}

export default IndicatorPanel;