import si from 'systeminformation';

// define all values, you want to get back
let valueObject = {
  currentLoad: 'currentLoad,currentLoadUser,avgLoad',
  cpuTemperature: 'main',
  mem: 'free,total,active,available',
  networkStats: 'tx_bytes,rx_bytes,rx_sec,tx_sec,ms',
}

function usersCallback(data) {
  console.log(JSON.stringify(data));
}

// now define the observer function
let observer = si.observe(valueObject, 1000, usersCallback);

// // In this example we stop our observer function after 30 seconds
// setTimeout(() => {
//   clearInterval(observer)
// }, 30000);