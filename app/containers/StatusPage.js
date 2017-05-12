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
import List from 'grommet/components/List';
import ListItem from 'grommet/components/ListItem';
import Split from 'grommet/components/Split';
import TextInput from 'grommet/components/TextInput';
import Box from 'grommet/components/Box';
import Title from 'grommet/components/Title';
import Button from 'grommet/components/Button';




const openpgp = require('openpgp');

require('events').EventEmitter.defaultMaxListeners = 20;

const PORT = 42001;
const NUM_NODES = 7;

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

async function createTestNodeOnPort(id) {
  const logger = new kad.Logger(1);
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
  return node;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class StatusPage extends Component {
  constructor() {
    super();
    this.start();

    this.state = {
      peer1Messages: [],
      peer6Messages: [],
      peer1Text: 'Hello from 1!',
      peer6Text: 'Hello from 6!',
    };
  }

  async start() {
    console.log('starting network');
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

      nodes[i].connect(seed2, console.err);
    }

    setTimeout(() => {
      // navigator.getUserMedia({ },
      //   (stream) => this.startPage(stream, topics), () => {});
      this.startPage(topics);
    }, 3000);
  }

  startPage(topics) {
    let seq1 = 0;
    let seq6 = 0;
    let last1 = -1;
    let last6 = -1;

    let peer1pkts = [];
    let peer6pkts = [];

    let peer1;
    let peer6;

    const peer1key = openpgp.key.readArmored(pubKey1File).keys[0];
    const peer6key = openpgp.key.readArmored(pubKey2File).keys[0];

    const peer1Fingerprint = peer1key.primaryKey.fingerprint;
    const peer6Fingerprint = peer6key.primaryKey.fingerprint;

    console.log(peer1key);


    this.topics[6].subscribe(peer6Fingerprint, async (data) => {
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

    this.topics[1].subscribe(peer1Fingerprint, async (data) => {
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
      peer1 = new SimplePeer({ initiator: true });
      peer6 = new SimplePeer();

      this.peer1 = peer1;
      this.peer6 = peer6;


      peer1.on('signal', (data) => {
        // when peer1 has signaling data, give it to peer6 somehow
        setTimeout(() => {
          topics[1].publish(peer6Fingerprint, { data, time: new Date().toJSON(), seq: seq1 });
          console.log('node6RTC', { data, time: new Date().toJSON(), seq: seq1 });

          const curSeq1 = seq1;

          setTimeout(() => {
            topics[1].publish(peer6Fingerprint, { data, time: new Date().toJSON(), seq: curSeq1 });
            console.log('node6RTC', { data, time: new Date().toJSON(), seq: curSeq1 });
          }, 100);


          seq1 += 1;
        }, 0);
      });

      peer6.on('signal', (data) => {
        // when peer6 has signaling data, give it to peer1 somehow
        setTimeout(() => {
          topics[6].publish(peer1Fingerprint, { data, time: new Date().toJSON(), seq: seq6 });
          console.log('node1RTC', { data, time: new Date().toJSON(), seq: seq6 });

          const curSeq6 = seq6;

          setTimeout(() => {
            topics[6].publish(peer1Fingerprint, { data, time: new Date().toJSON(), seq: curSeq6 });
            console.log('node1RTC', { data, time: new Date().toJSON(), seq: curSeq6 });
          }, 100);

          seq6 += 1;
        }, 0);
      });

      peer1.on('connect', () => {
        // wait for 'connect' event before using the data channel
        console.log('peer1 connected');
        // peer1.send(JSON.stringify({ message: 'hello1' }));
      });

      peer6.on('connect', () => {
        // wait for 'connect' event before using the data channel
        console.log('peer6 connected');
        // peer6.send(JSON.stringify({ message: 'hello6' }));
      });

      peer6.on('data', async (data) => {
        // got a data channel message
        console.log(`got a message from peer1: ${data}`);

        const messageObj = JSON.parse(data.toString());

        const decryptedMsg = await decryptString(privKey2File, messageObj.message);


        this.setState({
          peer6Messages: [...this.state.peer6Messages, decryptedMsg]
        });
      });

      peer1.on('data', async data => {
        console.log(`got a message from peer6: ${data}`);

        const messageObj = JSON.parse(data.toString());

        const decryptedMsg = await decryptString(privKey1File, messageObj.message);


        this.setState({
          peer1Messages: [...this.state.peer1Messages, decryptedMsg]
        });
      });
    }, 1000);
  }

  async sendPeer1() {
    const encryptedMessage = await encryptString(pubKey2File, this.state.peer1Text);


    this.peer1.send(JSON.stringify({ message: encryptedMessage }));
  }

  async sendPeer6() {
    const encryptedMessage = await encryptString(pubKey1File, this.state.peer6Text);


    this.peer6.send(JSON.stringify({ message: encryptedMessage }));
  }

  onPeer1TextChange(e) {
    this.setState({
      peer1Text: e.target.value,
    });
  }

  onPeer6TextChange(e) {
    this.setState({
      peer6Text: e.target.value,
    });
  }


  render() {
    return (
      <div>
        <Split>
          <Box colorIndex='neutral-1'
               justify='center'
               align='center'
               pad='medium'>
            <Title>Peer1</Title>
            <List>
              {
                this.state.peer1Messages.map((m, i) => (
                  <ListItem key={i}>
                    {m}
                  </ListItem>))
              }
            </List>
            <TextInput value={this.state.peer1Text} onDOMChange={(e) => this.onPeer1TextChange(e)} />
            <Button onClick={() => this.sendPeer1()} label="Send" />
          </Box>
          <Box colorIndex='neutral-2'
               justify='center'
               align='center'
               pad='medium'>
            <Title>Peer6</Title>
            <List>
              {
                this.state.peer6Messages.map((m, i) => (
                  <ListItem key={i}>
                    {m}
                  </ListItem>))
              }
            </List>
            <TextInput value={this.state.peer6Text} onDOMChange={(e) => this.onPeer6TextChange(e)} />
            <Button onClick={() => this.sendPeer6()} label="Send" />
          </Box>
        </Split>
      </div>
    );
  }
}


export default (StatusPage);
