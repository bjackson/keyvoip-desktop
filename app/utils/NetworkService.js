export async function encryptString(key, data) {
  const options = {
    data,
    publicKeys: openpgp.key.readArmored(key).keys,
  };

  const ciphertext = await openpgp.encrypt(options);
  return ciphertext.data;
}

export async function decryptString(key, data) {
  const options = {
    message: openpgp.message.readArmored(data),     // parse armored message
    privateKey: openpgp.key.readArmored(key).keys[0], // for decryption
  };

  const plaintext = await openpgp.decrypt(options);
  return plaintext.data;
}

export function createTestNodeOnPort(id) {
  // var logger = new kad.Logger(0);
  var contact = {
    address: '127.0.0.1',
    port: id + PORT,
  };

  var node = new kad.Node({
    transport: kad.transports.UDP(kad.contacts.AddressPortContact(contact)),
    storage: levelup(`./node-${id}-storage.db`, { db: require('memdown') }),
  });


  console.log(node);
  return node;
}
