import React, { useEffect, useRef } from 'react';
import { MissionLogEntry } from '../types';

interface MissionLogProps {
  logs: MissionLogEntry[];
}

const MissionLog: React.FC<MissionLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-black border border-[#333] p-4 h-40 overflow-y-auto font-['VT323'] text-[#4aff4a] text-xl w-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-black">
        {logs.map((log, idx) => (
            <div key={idx} className="border-b border-[#111] mb-2 pb-1 last:border-0 flex items-start">
                <span className="text-[#444] text-sm mr-3 font-mono pt-1 select-none">{log.timestamp}</span>
                <span className="uppercase tracking-wider leading-tight">{log.message}</span>
            </div>
        ))}
        <div ref={bottomRef} />
    </div>
  );
};

export default MissionLog;