import { initiateWebSocket } from 'omni-rpc';


(async () => {

  const peer = await initiateWebSocket({ host: '127.0.0.1', port: 9001 });

  let state = {};

  const stateProducer = peer.getStateStream();
  stateProducer.forEach(newState => {
    state = newState;
    console.log(state);
  });

  const positionProducer = peer.getPositionsStream();
  stateProducer.forEach(update => {
    state.families[update.familyId].x = update.x;
    state.families[update.familyId].y = update.y;
    console.log(state);
  });

  const conduit = new MapConduit(x => x);
  peer.setPositionStream(conduit);

  const squareConduit = new MapConduit(x => x);

  let counter = 0;
  setInterval(() => {
    conduit.write({ familyId: 0, x: 10, y: 10 });
    squareConduit.write(counter++);
  }, 1000);

  const squares = peer.square(squareConduit);
  squares.forEach(squared => {
    console.log(squared);
  });

})();

