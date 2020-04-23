This repository contains the `proxy.js` smart contract that
locks the money under a certain time moment.

# Usage

Sender:

    const handle = // unique handle (to disallow users not having the handle to withdraw our payment)
    const data = // date of the payment  
    const sendInvite = inviteIssuer.claim(publicAPI.makeSendInvite(harden(payment), harden(handle), harden(date))());
    const aliceProposal = {};
    return zoe
    .offer(sendInvite, harden(aliceProposal), {})

Receiver:

    const receiveInvite = inviteIssuer.claim(publicAPI.makeReceiveInvite(handle)());
    const bobProposal = {}
    return zoe
    .offer(receiveInvite, harden(bobProposal), {})
    // ...
    const wrapperPayment = await (await payout).Wrapper;
    const amount = await E(publicAPI.issuer).getAmountOf(wrapperPayment);
    const payment = await E(publicAPI.issuer).getAmountOf(amount.extent[0][0]);
    const timeRelease = payment.extent[0][0];
    const realPayment = await timeRelease.getPayment()

Now `realPayment` is either the payment we can receive or null if the time has not yet come.
