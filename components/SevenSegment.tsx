import React from 'react';

interface SevenSegmentProps {
  value: string;
  label: string;
  showSign?: boolean;
  digits?: number;
  blinking?: boolean;
}

const SevenSegment: React.FC<SevenSegmentProps> = ({ value, label, showSign = false, digits = 2, blinking = false }) => {
  // Formatting
  let displayValue = value;
  let sign = '';

  if (showSign) {
     if (value.startsWith('+') || value.startsWith('-')) {
         sign = value.charAt(0);
         displayValue = value.substring(1);
     } else {
         sign = ' '; // Space for positive if not explicit
         if (value.length === digits) {
             // value already includes digits?
         } else {
             sign = '+';
         }
     }
  }

  // Ensure length matches digits
  if (displayValue.length < digits) {
      // pad based on type
      const isNum = !isNaN(parseInt(displayValue));
      displayValue = isNum ? displayValue.padStart(digits, '0') : displayValue.padStart(digits, ' ');
  }

  return (
    <div className="flex justify-between items-center bg-[#0a0a0a] px-2 h-[38px] mb-[6px]">
        {/* Label */}
        <span className="text-[#aaa] text-[11px] w-10 font-bold tracking-wider">{label}</span>
        
        {/* Digits */}
        <div className={`flex items-center transition-opacity duration-75 ${blinking ? 'opacity-0' : 'opacity-100'}`}>
            {showSign && (
                <span className={`font-['VT323'] text-[32px] leading-none mr-1 ${sign === '+' ? 'text-[#4aff4a]' : 'text-[#4aff4a]'}`}>
                    {sign}
                </span>
            )}
            <span className="font-['VT323'] text-[#4aff4a] text-[32px] leading-none dsky-digit tracking-widest">
                {displayValue}
            </span>
        </div>
    </div>
  );
};

export default SevenSegment;