import React from 'react';
import { states } from '../data';
import { isColorTooLight } from '../functions';
import GlassBall from '../components/GlassBall';

const SelectionPage = ({ setSelection, takenStates, setServer=()=>{} }) => {
  // takenStates: an array of strings with already selected state names

  const handleClick = (state) => {
    // Only allow selection if the state is NOT already taken
    if (!takenStates.includes(state.name)) {
      setSelection(state);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('server');
    setServer(null);
    console.log("Server config cleared.");
  };

  return (
    <div style={{ width: '99vw', overflow: 'hidden', position: 'relative' }}>
      <div style={{ marginTop: '2.5%', fontSize: 48, fontWeight: 'bold' }}>Globe Simulator</div>
      <div style={{ marginTop: '2.5%', fontSize: 24 }}><button onClick={handleClear} style={{width: '10%', fontSize: 24, padding: '4px', cursor: 'pointer', borderRadius: '8px', backgroundColor: '#1c08f1', border: 'solid 2px white'}}>Change server</button></div>
      <div style={{ marginTop: '1.5%', marginBottom: '1.5%', fontSize: 24 }}>Choose your nation:</div>
      <div
        style={{
          width: '80%',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginBottom: '2em',
          display: 'grid',
          gridTemplateColumns: '25% 25% 25%',
          justifyContent: 'center',
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
                backgroundColor: isTaken ? '#555555' : state.color ?? '#000000', // Dim if taken
                color: state.color && isColorTooLight(state.color) ? '#000000' : '#ffffff',
                borderRadius: '1em',
                cursor: isTaken ? 'not-allowed' : 'pointer',
                opacity: isTaken ? 0.6 : 1,
                fontSize: 42,
                fontWeight: 'bold',
              }}
            >
              <img src={state.icon} alt={"logo"} style={{height: '50%', filter: state.color && isColorTooLight(state.color) ? 'invert(1) sepia(1) saturate(10000%) hue-rotate(180deg)' : ''}}/>
              <div>{state.name}</div>
              <div style={{width: '60%', height: '2px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '5%', backgroundColor: state.color && isColorTooLight(state.color) ? '#000000' : '#ffffff', borderRadius: '12px'}}></div>
              <div style={{fontWeight: 'normal', fontSize: 24, width: '60%', marginLeft: 'auto', marginRight: 'auto'}}>
                {state.cities.map((city, index) => (
                  <span key={index} style={{fontWeight: city === state.capital ? 'bold' : 'normal'}}>{city}, </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <GlassBall x={-100} y={-100} radius={380} from={'#18efff'} to={'#1c08f1'} />
      <GlassBall x={-100} y={-100} rev={true} radius={380} from={'#18efff'} to={'#1c08f1'} />
    </div>
  );
};

export default SelectionPage;
