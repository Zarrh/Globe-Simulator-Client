import React from 'react';
import { states } from '../data';

const SelectionPage = ({ setSelection, takenStates }) => {
  // takenStates: an array of strings with already selected state names

  const handleClick = (state) => {
    // Only allow selection if the state is NOT already taken
    if (!takenStates.includes(state.name)) {
      setSelection(state);
    }
  };

  return (
    <div>
      <div style={{ marginTop: '2.5%', fontSize: 48, fontWeight: 'bold' }}>Globe Simulator</div>
      <div style={{ marginTop: '1.5%', marginBottom: '1.5%', fontSize: 24 }}>Choose your country:</div>
      <div
        style={{
          width: '60%',
          marginLeft: 'auto',
          marginRight: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2em',
        }}
      >
        {states.map((state, index) => {
          const isTaken = takenStates.includes(state.name);
          return (
            <div
              key={index}
              onClick={() => handleClick(state)}
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '25% 25% 25%',
                justifyContent: 'center',
                backgroundColor: isTaken ? '#555555' : '#000000', // Dim if taken
                borderRadius: '2em',
                cursor: isTaken ? 'not-allowed' : 'pointer',
                opacity: isTaken ? 0.6 : 1,
              }}
            >
              <div>img</div>
              <div>{state.name}</div>
              <div>{state.capital}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelectionPage;
