import React, { Component } from 'react';
import { Link } from 'react-router';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as StatusActions from '../actions/status';
import fs from 'fs';
import kad from 'kad';
import traverse from 'kad-traverse';
// import kadUtils from 'kad/utils';
import quasar from 'kad-quasar';
import _ from 'lodash';
import { remote } from 'electron';
import path from 'path';
import {
  privKey1File,
  privKey2File,
  pubKey1File,
  pubKey2File,
} from '../keys/keys';
import levelup from 'levelup';
import SimplePeer from 'simple-peer';
const openpgp = require('openpgp');

require('events').EventEmitter.defaultMaxListeners = 20;

var PORT = 42001;
var NUM_NODES = 7;

// const NODE_IDs = [
//   'f511e1445170b19d6f18a45bf434818856ac0a7f',
//   '0edbdc3d4c2b868f5202aadb80ec8530e118de3c',
//   '99b5bd247f0c9f77c7da86c4657628eccfacb9ca',
//   'd9fb3035728f1e0fabe86133a745454a368d99ff',
//   'e343560af0185062c239f616009ae013a3e80ba3',
//   '5b3e6977f5d0588ae09c3ae5ce5291a8faa25e8c',
//   'f3d02af52766cf6e7fc1ca435e94175f17210e30',
//   '8afeca0b25ff71dca94b3e2c488934d7cd61489c',
//   'c5e428f84be9c7015584b277c1762ce9a865fb7d',
//   'd7d374339f0fd4aa8efbfdbd30b7072327c75f80',
//   'b6c04ce63dfa6434cc9ef42a25e97f9fd0e23dc9',
//   '9f4c1384bfbf609bd7373c6bf6626cf67e8cbb8d',
// ];

async function encryptString(key, data) {
  const options = {
    data,
    publicKeys: openpgp.key.readArmored(key).keys,
  };

  const ciphertext = await openpgp.encrypt(options);
  return ciphertext.data;
}

async function decryptString(key, data) {
  const options = {
    message: openpgp.message.readArmored(data),     // parse armored message
    privateKey: openpgp.key.readArmored(key).keys[0], // for decryption
  };

  const plaintext = await openpgp.decrypt(options);
  return plaintext.data;
}

// for (var i = 0; i < 10; i++) {
//   console.log(kad.utils.getRandomKeyString());
// }

async function createTestNodeOnPort(id) {
  const logger = new kad.Logger(1);
  const contact = kad.contacts.AddressPortContact({
    address: '127.0.0.1',
    port: id + PORT,
  });
  // Decorate your transport
  // const NatTransport = traverse.TransportDecorator(kad.transports.UDP);
  //
  // // Create your transport with options
  // const transport = new NatTransport(contact, {
  //   traverse: {
  //     upnp: { port: PORT + id, ttl: 0 },
  //     stun: {
  //       address: 'stun.l.google.com',
  //       port: 19302,
  //     },
  //    turn: {
  //      server: {
  //        address: '192.158.29.39', port: 3478
  //      }
  //    }
  //   }
  // });


  var node = new kad.Node({
    logger,
    transport: kad.transports.UDP(contact),
    storage: kad.storage.MemStore(),
  });


  console.log(node);
  await sleep(500);
  return node;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class StatusPage extends Component {
  constructor() {
    super();

  }

  async start() {
    console.log('starting network');
    // const nodes = await _.map(_.range(NUM_NODES), async (n) => { return await createTestNodeOnPort(n) });
    const nodes = [];

    for (var i = 0; i < NUM_NODES; i++) {
      let node = await createTestNodeOnPort(i);
      nodes.push(node);
    }
    console.log(nodes);

    const topics = _.map(nodes, node => new quasar.Protocol(node._router));
    this.topics = topics;



    for (var i = 1; i < NUM_NODES; i++) {
      let seed = {
          address: '127.0.0.1',
          port: PORT + ((i + 1) % NUM_NODES),
      };
      // let seed = {
      //     address: 'brettjackson.org',
      //     port: PORT,
      // };


      nodes[i].connect(seed, err => console.err);

      await sleep(500);
    }

    // setTimeout(async function () {
    //   console.log('TIMEOUT 1');
    //   topics[3].subscribe('node1Msg', async (data) => {
    //     console.log('GOT MESSAGE');
    //     const decryptedString = await decryptString(privKey1File, data);
    //     console.log(decryptedString);
    //   });
    //
    //   // nodes[3].put('node3k', 'node3v');
    //
    //
    //   setTimeout(async function () {
    //     const encryptedMessage = await encryptString(pubKey1File, 'hello node1 from node11!');
    //     topics[11].publish('node1Msg', encryptedMessage);
    //     console.log(nodes[11]);
    //     console.log(nodes[3]);
    //     // nodes[5].put('node5k', 'node5v');
    //     // nodes[5].put('node3k', 'node3v2');
    //   }, 3000);
    // }, 1000);



    navigator.getUserMedia({ video: true, audio: true }, (stream) => this.gotMedia(stream, topics), function () {})
  }

  gotMedia(stream, topics) {

    const peer1 = new SimplePeer({ initiator: true, stream: stream });
    const peer6 = new SimplePeer();

    let signal1 = true;
    let signal6 = true;

    this.topics[6].subscribe('node6RTC', async (data) => {
      console.log('GOT RTC MESSAGE 6');
      // const decryptedString = await decryptString(privKey1File, data);
      console.log(data);
      const dt = new Date(data.time);
      console.warn((new Date() - dt) / 1000);
      // if (signal6 && (((new Date() - dt) / 1000) < 5)) {
        signal6 = false;
        peer6.signal(data.data);
      // }
    });

    this.topics[1].subscribe('node1RTC', async (data) => {
      console.log('GOT RTC MESSAGE 1');
      // const decryptedString = await decryptString(privKey1File, data);
      console.log(data);
      const dt = new Date(data.time);
      console.warn((new Date() - dt) / 1000);
      // if (signal1 && (((new Date() - dt) / 1000 < 5))) {
        signal1 = false;
        peer1.signal(data.data);
      // }
    });

    peer1.on('signal',  (data) => {
      // when peer1 has signaling data, give it to peer6 somehow
      setTimeout(function () {
        topics[1].publish('node6RTC', { data: data, time: new Date().toJSON() });
      }, 2000);
    })

    peer6.on('signal',  (data) => {
      // when peer6 has signaling data, give it to peer1 somehow
      setTimeout(function () {
        topics[6].publish('node1RTC', { data: data, time: new Date().toJSON() });
      }, 2000);
    })

    peer1.on('connect',  () => {
      // wait for 'connect' event before using the data channel
      console.log('peer1 connected');
    });

    peer6.on('connect',  () => {
      // wait for 'connect' event before using the data channel
      console.log('peer6 connected');
    });

    peer6.on('data',  (data) => {
      // got a data channel message
      console.log('got a message from peer1: ' + data);
    });

    peer6.on('stream',  (stream) => {
      // got remote video stream, now let's show it in a video tag
      var video = document.getElementById('videoPl');
      video.src = window.URL.createObjectURL(stream);
      video.play();
    });
  }

  render() {
    return (
      <div>
        <h3>hi</h3>
        <button onClick={() => this.start()}>Start me up!</button>
        <video id="videoPl"></video>
      </div>
    );
  }
}


function mapStateToProps(state) {
  return {
    status: state.Status
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(StatusActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(StatusPage);
