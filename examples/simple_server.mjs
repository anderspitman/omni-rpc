import { WebSocketAcceptor } from 'omni-rpc';


const acceptor = new WebSocketAcceptor({ port: 9001 });

const state = {
  families: {},
};
const peers = [];

setInterval(() => {
  acceptor.getAllPeerConsumers('state', consumer => {
    consumer.write(state);
  });
}, 1000);


function setFamilyPosition(familyId, x, y) {
  state.families[familyId].x = x;
  state.families[familyId].y = y;

  acceptor.getAllPeerConsumers('positions', consumer => {
    consumer.write({ familyId, x, y });
  });
}

acceptor.onPeer(peer => {

  peers.push(peer);

  peer.implement({
    getState: () => {
      return state;
    },

    getStateStream: () => {
      const { consumer, producer } = new DropConduit().split();
      peer.addConsumer('state', consumer);
      return producer;
    },

    getPositionsStream: () => {
      const { consumer, producer } = new DropConduit().split();
      peer.addConsumer('positions', consumer);
      return producer;
    },

    setFamilyPosition,

    setPositionStream: producer => {
      producer.forEach(update => {
        setFamilyPosition(update.familyId, update.x, update.y);
      });
    },

    square: producer => producer.pipe_through(new MapConduit(x => x*x)),
});
