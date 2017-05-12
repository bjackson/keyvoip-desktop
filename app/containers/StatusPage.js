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

const PORT = 42001;
const NUM_NODES = 7;

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
  const logger = new kad.Logger(4);
  let transport = kad.transports.UDP(kad.contacts.AddressPortContact({
    address: '127.0.0.1',
    port: id + PORT
  }));

  const storage = kad.storage.MemStore();

  const node = new kad.Node({
    logger,
    transport,
    storage,
  });


  console.log(node);
  // await sleep(500);
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

    for (let i = 0; i < NUM_NODES; i++) {
      const node = await createTestNodeOnPort(i);
      nodes.push(node);
    }
    console.log(nodes);

    const topics = _.map(nodes, node => new quasar.Protocol(node._router));
    this.topics = topics;


    for (let i = 0; i < NUM_NODES; i++) {
      const seed2 = {
        address: 'localhost',
        port: PORT + ((i + 1) % NUM_NODES),
      };
      // const seed = {
      //   address: 'brettjackson.org',
      //   port: PORT,
      // };


      // nodes[i].connect(seed, err => console.err);
      nodes[i].connect(seed2, console.err);

      // await sleep(500);
    }

    setTimeout(() => {
      navigator.getUserMedia({ video: true, audio: true },
        (stream) => this.gotMedia(stream, topics), () => {});
    }, 9000);
  }

  gotMedia(stream, topics) {
    let seq1 = 0;
    let seq6 = 0;
    let last1 = -1;
    let last6 = -1;

    let peer1pkts = [];
    let peer6pkts = [];

    let peer1;
    let peer6;


    this.topics[6].subscribe('node6RTC', async (data) => {
      console.log('GOT RTC MESSAGE 6');
      console.log(data);

      if (data.seq === last6 + 1) {
        _.forEach(peer6pkts, pkt => {
          if (pkt.seq === last6 + 1) {
            console.log(`PEER 6: Processing pkt: ${pkt.seq}`);
            peer6.signal(pkt.data);
            last6 = pkt.seq;
          }
        });
        console.log(`PEER 6: Processing pkt: ${data.seq}`);
        last6 = data.seq;
        peer6.signal(data.data);
      } else if (data.seq > last6 + 1) {
        peer6pkts.push(data);
        peer6pkts = _.sortBy(peer6pkts, n => n.seq);
      }
    });

    this.topics[1].subscribe('node1RTC', async (data) => {
      console.log('GOT RTC MESSAGE 1');
      console.log(data);

      if (data.seq === last1 + 1) {
        _.forEach(peer1pkts, pkt => {
          if (pkt.seq === last1 + 1) {
            console.log(`PEER 1: Processing pkt: ${pkt.seq}`);
            peer1.signal(pkt.data);
            last1 = pkt.seq;
          }
        });
        console.log(`PEER 1: Processing pkt: ${data.seq}`);
        last1 = data.seq;
        peer1.signal(data.data);
      } else if (data.seq > last1 + 1) {
        peer1pkts.push(data);
        peer1pkts = _.sortBy(peer1pkts, n => n.seq);
      }
    });

    setTimeout(() => {
      peer1 = new SimplePeer({ initiator: true, stream });
      peer6 = new SimplePeer();

      peer1.on('signal', (data) => {
        // when peer1 has signaling data, give it to peer6 somehow
        setTimeout(() => {
          topics[1].publish('node6RTC', { data, time: new Date().toJSON(), seq: seq1 });
          console.log('node6RTC', { data, time: new Date().toJSON(), seq: seq1 });

          const curSeq1 = seq1;

          setTimeout(() => {
            topics[1].publish('node6RTC', { data, time: new Date().toJSON(), seq: curSeq1 });
            console.log('node6RTC', { data, time: new Date().toJSON(), seq: curSeq1 });
          }, 100);


          seq1 += 1;
        }, 0);
      });

      peer6.on('signal', (data) => {
        // when peer6 has signaling data, give it to peer1 somehow
        setTimeout(() => {
          topics[6].publish('node1RTC', { data, time: new Date().toJSON(), seq: seq6 });
          console.log('node1RTC', { data, time: new Date().toJSON(), seq: seq6 });

          const curSeq6 = seq6;

          setTimeout(() => {
            topics[6].publish('node1RTC', { data, time: new Date().toJSON(), seq: curSeq6 });
            console.log('node1RTC', { data, time: new Date().toJSON(), seq: curSeq6 });
          }, 100);

          seq6 += 1;
        }, 0);
      });

      peer1.on('connect', () => {
        // wait for 'connect' event before using the data channel
        console.log('peer1 connected');
      });

      peer6.on('connect', () => {
        // wait for 'connect' event before using the data channel
        console.log('peer6 connected');
      });

      peer6.on('data', (data) => {
        // got a data channel message
        console.log(`got a message from peer1: ${data}`);
      });

      peer6.on('stream', (stream2) => {
        // got remote video stream, now let's show it in a video tag
        const video = document.getElementById('videoPl');
        video.src = window.URL.createObjectURL(stream2);
        video.play();
      });
    }, 1000);
  }

  render() {
    return (
      <div>
        <h3>hi</h3>
        <button onClick={() => this.start()}>Start me up!</button>
        <video id="videoPl" />
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
