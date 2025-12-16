import React from 'react';

interface KeypadProps {
  onKeyPress: (key: string) => void;
}

const Keypad: React.FC<KeypadProps> = ({ onKeyPress }) => {
  
  const renderBtn = (label: string, color: 'yellow' | 'white') => {
    let borderTop = color === 'yellow' ? 'border-t-[#ccaa00]' : 'border-t-[#ccc]';
    
    return (
      <button
        key={label}
        onClick={() => onKeyPress(label)}
        className={`
          ${borderTop} border-t-4 border border-black 
          bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a]
          text-[#ddd] font-bold text-lg font-mono
          py-4 active:bg-[#111] active:translate-y-[2px] transition-transform rounded-sm
          flex items-center justify-center
        `}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Row 1 */}
      {renderBtn('VERB', 'yellow')}
      {renderBtn('NOUN', 'yellow')}
      {renderBtn('ENTR', 'yellow')}

      {/* Row 2 */}
      {renderBtn('7', 'white')}
      {renderBtn('8', 'white')}
      {renderBtn('9', 'white')}

      {/* Row 3 */}
      {renderBtn('4', 'white')}
      {renderBtn('5', 'white')}
      {renderBtn('6', 'white')}

      {/* Row 4 */}
      {renderBtn('1', 'white')}
      {renderBtn('2', 'white')}
      {renderBtn('3', 'white')}

      {/* Row 5 */}
      {renderBtn('CLR', 'white')}
      {renderBtn('0', 'white')}
      {renderBtn('KEY REL', 'white')}

      {/* Row 6 */}
      {renderBtn('PRO', 'yellow')}
      {renderBtn('RSET', 'yellow')}
      {renderBtn('LAMP', 'yellow')} 
    </div>
  );
};

export default Keypad;