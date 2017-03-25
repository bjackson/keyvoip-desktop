const kad = require('kad');
const quasar = require('kad-quasar');
const traverse = require('kad-traverse');

var logger = new kad.Logger(4);
var contact = kad.contacts.AddressPortContact({
  address: 'brettjackson.org',
  port: 42001
});

// Decorate your transport
const NatTransport = traverse.TransportDecorator(kad.transports.UDP);

// Create your transport with options
// const transport = new NatTransport(contact, {
//     traverse: {
//       upnp: { port: PORT + id },
//       stun: {
//         address: 'stun.services.mozilla.com',
//         port: 3478,
//       },
//       // turn: { /* options */ }
//     }
// });

var node = new kad.Node({
  logger,
  transport: kad.transports.UDP(contact),
  storage: kad.storage.MemStore(),
});

const topic = new quasar.Protocol(node._router);
