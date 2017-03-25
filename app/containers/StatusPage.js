import React, { Component } from 'react';
import { Link } from 'react-router';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as StatusActions from '../actions/status';
import fs from 'fs';
import kad from 'kad';
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
const openpgp = require('openpgp');
// import leveldown from 'leveldown';

var PORT = 42001;
var NUM_NODES = 12;

const NODE_IDs = [
  'f511e1445170b19d6f18a45bf434818856ac0a7f',
  '0edbdc3d4c2b868f5202aadb80ec8530e118de3c',
  '99b5bd247f0c9f77c7da86c4657628eccfacb9ca',
  'd9fb3035728f1e0fabe86133a745454a368d99ff',
  'e343560af0185062c239f616009ae013a3e80ba3',
  '5b3e6977f5d0588ae09c3ae5ce5291a8faa25e8c',
  'f3d02af52766cf6e7fc1ca435e94175f17210e30',
  '8afeca0b25ff71dca94b3e2c488934d7cd61489c',
  'c5e428f84be9c7015584b277c1762ce9a865fb7d',
  'd7d374339f0fd4aa8efbfdbd30b7072327c75f80',
  'b6c04ce63dfa6434cc9ef42a25e97f9fd0e23dc9',
  '9f4c1384bfbf609bd7373c6bf6626cf67e8cbb8d',
];

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

function createTestNodeOnPort(id) {
  // var logger = new kad.Logger(0);
  var contact = {
    hostname: '127.0.0.1',
    port: id + PORT,
  };
  var node = kad({
    transport: new kad.HTTPTransport(),
    storage: levelup(`./node-${id}-storage.db`, { db: require('memdown') }),
  });


  node.listen(id + PORT);

  node.plugin(quasar);


  console.log(node);
  return node;
}

class StatusPage extends Component {
  constructor() {
    super();
    // const nodes = _.map(_.range(NUM_NODES), createTestNodeOnPort);
    const nodes = [];

    for (var i = 0; i < NUM_NODES; i++) {
      nodes.push(createTestNodeOnPort(i));
    }



    for (var i = 1; i < NUM_NODES; i++) {
      let seed = [
        NODE_IDs[((i + 1) % NUM_NODES)],
        {
          hostname: '127.0.0.1',
          port: PORT + ((i) % NUM_NODES),
        },
      ];

      console.log(seed[1].port);

      nodes[i].join(seed);
    }

    setTimeout(async function () {
      console.log('TIMEOUT 1');
      nodes[1].quasarSubscribe('node1Msg', async (data) => {
        const decryptedString = await decryptString(privKey1File, data);
        console.log(decryptedString);
      });

      // nodes[3].put('node3k', 'node3v');


      setTimeout(async function () {
        const encryptedMessage = await encryptString(pubKey1File, 'hello node1 from node11!');
        nodes[11].quasarPublish('node1Msg', encryptedMessage);
        // nodes[5].put('node5k', 'node5v');
        // nodes[5].put('node3k', 'node3v2');
      }, 1000);
    }, 1000);
  }

  render() {
    return (
      <div>
        <h3>hi</h3>
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
