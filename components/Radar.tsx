
import React, { useMemo } from 'react';
import { PhysicsState } from '../types';

interface RadarProps {
  physics: PhysicsState;
}

const Radar: React.FC<RadarProps> = ({ physics }) => {
  const { altitude, velocity, thrust, active } = physics;

  // Radar View Configuration
  const MAX_VIEW_ALTITUDE = 3000; // Meters shown on screen
  const VIEW_HEIGHT = 300;
  const VIEW_WIDTH = 300;
  const GROUND_Y = 280;

  // Calculate Ship Position (clamped to top if too high)
  const shipY = useMemo(() => {
    if (altitude > MAX_VIEW_ALTITUDE) return 40; // Stuck at top
    // Linear interpolation from Ground (280) to Top (40) based on Alt (0 to 3000)
    const ratio = altitude / MAX_VIEW_ALTITUDE;
    return GROUND_Y - (ratio * (GROUND_Y - 40));
  }, [altitude]);

  const isOutOfRange = altitude > MAX_VIEW_ALTITUDE;
  const flameSize = (thrust / 100) * 20;

  return (
    <div className="bg-[#001100] border-2 border-[#1a331a] p-2 rounded relative shadow-[inset_0_0_40px_rgba(0,50,0,0.8)] h-full min-h-[400px] flex flex-col items-center justify-center overflow-hidden">
      
      {/* CRT Overlay Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_4px,6px_100%]"></div>
      
      <div className="absolute top-2 left-3 text-xs text-[#00ff00] font-mono opacity-70 z-20">
        <div>RADAR MODE: TERR</div>
        <div>SCALE: {MAX_VIEW_ALTITUDE}M</div>
      </div>

      <div className="absolute top-2 right-3 text-right text-xs text-[#00ff00] font-mono z-20">
        <div>ALT: {altitude.toFixed(0)} M</div>
        <div>VEL: {velocity.toFixed(1)} M/S</div>
      </div>

      <svg width="100%" height="100%" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="z-0">
        {/* Grid Lines */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#003300" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Ground Terrain */}
        <path d={`M 0 ${GROUND_Y} L ${VIEW_WIDTH} ${GROUND_Y}`} stroke="#00ff00" strokeWidth="2" />
        {/* Rough terrain jagged lines */}
        <path d={`M 0 ${GROUND_Y} L 20 ${GROUND_Y-5} L 50 ${GROUND_Y} L 90 ${GROUND_Y+2} L 120 ${GROUND_Y-3} L 180 ${GROUND_Y} L 240 ${GROUND_Y-8} L ${VIEW_WIDTH} ${GROUND_Y}`} stroke="#00aa00" strokeWidth="1" fill="none" opacity="0.6" />

        {/* Target Marker (Moon Base) */}
        <rect x={VIEW_WIDTH/2 - 10} y={GROUND_Y - 4} width="20" height="4" fill="#00aa00" />
        <path d={`M ${VIEW_WIDTH/2} ${GROUND_Y} L ${VIEW_WIDTH/2} ${GROUND_Y-20} M ${VIEW_WIDTH/2 - 5} ${GROUND_Y-15} L ${VIEW_WIDTH/2 + 5} ${GROUND_Y-15}`} stroke="#00aa00" strokeWidth="1" />

        {/* The Eagle (Lander) */}
        <g transform={`translate(${VIEW_WIDTH/2}, ${shipY})`}>
           {/* Thrust Flame */}
           {active && thrust > 0 && (
             <path 
               d={`M -4 10 L 0 ${10 + flameSize + Math.random()*5} L 4 10`} 
               fill="#ffcc00" 
               stroke="#ff9900" 
               strokeWidth="1" 
               className="animate-pulse"
             />
           )}
           
           {/* LM Body */}
           <path d="M -12 10 L 12 10 L 8 0 L -8 0 Z" fill="#000" stroke="#00ff00" strokeWidth="2" /> {/* Descent Stage */}
           <path d="M -8 0 L 8 0 L 6 -10 L -6 -10 Z" fill="#000" stroke="#00ff00" strokeWidth="2" /> {/* Ascent Stage */}
           
           {/* Legs */}
           <line x1="-12" y1="10" x2="-18" y2="18" stroke="#00ff00" strokeWidth="1" />
           <line x1="12" y1="10" x2="18" y2="18" stroke="#00ff00" strokeWidth="1" />
        </g>

        {/* Velocity Vector */}
        {Math.abs(velocity) > 1 && (
             <g transform={`translate(${VIEW_WIDTH/2 + 30}, ${shipY})`}>
                 <line x1="0" y1="0" x2="0" y2={-velocity / 2} stroke={velocity < 0 ? "#ff3333" : "#00ff00"} strokeWidth="2" />
                 <text x="5" y={-velocity / 4} fill="#00aa00" fontSize="10" fontFamily="monospace">V</text>
             </g>
        )}

      </svg>
      
      {/* Range Warning */}
      {isOutOfRange && (
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 text-[#ff0000] font-bold border border-red-500 px-2 bg-black animate-pulse z-20">
              RADAR RANGE LIMIT
          </div>
      )}

      {/* Surface Contact */}
      {altitude <= 0 && (
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-[#00ff00] font-bold text-lg bg-[#001100] px-3 border border-[#00ff00] z-20">
              CONTACT LIGHT
          </div>
      )}
    </div>
  );
};

export default Radar;
