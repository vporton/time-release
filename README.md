This repository contains the `proxy.js` smart contract that
locks the money under a certain time moment.

The contract first receives the money together with a unique handle (or secret key),
and then it can be withdrawn by anybody with the key under the condition that enough
time passed.

When withdrawn, the extent of the payment contains an object that contains another
payment (in a private variable). This "internal" payment could be obtained (as shown
in the test) and then withdrawn.

# Notes

This contract is intented to be deployed once and used from other contracts
(who would receive `registry` in `terms` to be able to obtain our contract).

# Deployment

```
agoric deploy contract/deploy.js
```

# Usage

Receiver side:

```
const bob = {
    receivePayment: async (wrapperPayment) => {
        const amount = await E(publicAPI.issuer).getAmountOf(wrapperPayment);
        const timeRelease = amount.extent[0][0];
        const realPayment = await timeRelease.getPayment()
        // `realPayment` is either the payment we can receive or null if the time has not yet come.
    }
}
```

`timeRelease` also has `getIssuer()` and `getAmount()` methods to query the payment data.

Sender:

```
const date = // date of the payment  
const sendInvite = inviteIssuer.claim(publicAPI.makeSendInvite(bob, harden(issuer), harden(payment), harden(date))());
const aliceProposal = {};
return zoe
    .offer(sendInvite, harden(aliceProposal), {})
```
