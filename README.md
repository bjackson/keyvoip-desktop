# Keyvoip

This is a demonstration of a PGP-based communication system that relies on a DHT.

The original plan was to implement VOIP, but complexity grew and it soon became much easier to just implement a text chat.

# Running
1. Install node.js
2. Run `npm install`
3. Run `npm run dev`.
4. Click `Status` in the sidebar.

Once you are in the main menu, which is the Status tab, you will see Peer1 and Peer6 side by side.
You can send messages from peer 1 to peer 6 and vis versa. 

These messages are encrypted using the respective peers' public keys and are sent over a WebRTC channel.
WebRTC signalling works by using a Kademlia-based DHT with the experimental Quasar protocol on top of it for
probabilistic pubsub. 

Each node subscribes to topics with its key's fingerprints.
A node wishing to make a connection with another node will send WebRTC signalling messages over the DHT,
addressed to the fingerprint of the public key of the node they wish to contact. 
Once the signalling information has been exchanged, the nodes communicate over the WebRTC channel that has been negotiated.

For convenience, both peers are shown in one window, but the WebRTC connections and DHT messages are still going on in the background.

It would be possible to alter the hardcoded keys and connect across a network using Keyvoip. 
However, NAT traversal is unreliable and will need to be solved before this can work across NATs.
 
