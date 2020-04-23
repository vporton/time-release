/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport';

import { makeTimeRelease } from './time-release';
import { cleanProposal } from '@agoric/zoe/src/cleanProposal';


// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
/**
 * @type {import('@agoric/zoe').MakeContract}
 */
export const makeContract = harden(zcf => {
  const { terms: { timerService } = {} } = zcf.getInstanceRecord();

  // Create the internal token mint
  const { issuer, mint, amountMath } = produceIssuer(
    'Wrapper',
    'set',
  );
  const wrapperToken = amountMath.make;

  let payments = new Map(); // from handle ({}) to payment

  return zcf.addNewIssuer(issuer, 'Wrapper').then(() => {
    const adminHook = userOfferHandle => {
    }

    // the contract creates an offer {give: wrapper, want: nothing} with the time release wrapper
    const sendHook = (paymentIssuer, lockedPayment, handle, date) => userOfferHandle => {
      const myPurse = paymentIssuer.makeEmptyPurse();
      const lockedAmount = myPurse.deposit(lockedPayment);

      const lock = makeTimeRelease(zcf, timerService, myPurse, date);

      payments.set(handle, lock);

      let tempContractHandle;
      const contractSelfInvite = zcf.makeInvitation(
        offerHandle => (tempContractHandle = offerHandle),
      );

      zcf
        .getZoeService()
        .offer(
          contractSelfInvite,
          harden({ /*want: { Wrapper: lockedAmount }*/ }),
          harden({ Wrapper: [handle] }),
        ).then(() => {
          // Don't forget to call this, otherwise the other side won't be able to get the money:
          lock.setOffer(tempContractHandle);

          zcf.reallocate(
            [tempContractHandle, userOfferHandle],
            [
              zcf.getCurrentAllocation(userOfferHandle),
              zcf.getCurrentAllocation(tempContractHandle),
            ],
          );
          zcf.complete([tempContractHandle, userOfferHandle]); // FIXME: enough just one of them?
          return `Payment scheduled.`;
        });
    }

    const receiveHook = (paymentIssuer, handle) => async userOfferHandle => {
      const timeLock = payments.get(handle);
      if(!timeLock) {
        return `Trying to get non-exisiting payment.`;
      }
      const purse = await timeLock.getPayment();
      if(!purse) {
        return `Trying to get a future-date payment.`;
      }
      const amount = purse.getCurrentAmount();
      const payment = purse.withdraw(amount);

      let tempContractHandle;
      const contractSelfInvite = zcf.makeInvitation(
        offerHandle => (tempContractHandle = offerHandle),
      );

      zcf
        .getZoeService()
        .offer(
          contractSelfInvite,
          harden({ /*give: { Wrapper: amount }*/ }), // FIXME
          harden({ Wrapper: payment }),
        ).then(() => {
          console.log(
            zcf.getCurrentAllocation(userOfferHandle),
            zcf.getCurrentAllocation(tempContractHandle),
          );
          zcf.reallocate(
            [tempContractHandle, userOfferHandle],
            [
              zcf.getCurrentAllocation(userOfferHandle),
              zcf.getCurrentAllocation(tempContractHandle),
            ],
          );
          zcf.complete([tempContractHandle, userOfferHandle]); // FIXME: enough just one of them?
          payments.delete(handle); // We already delivered it.

          return `Scheduled payment delivered.`;
        });
    }
    
    const { inviteAnOffer } = makeZoeHelpers(zcf);   
    
    const makeSendInvite = (paymentIssuer, payment, handler, date) => () =>
      inviteAnOffer(
        harden({
          offerHook: sendHook(paymentIssuer, payment, handler, date),
          customProperties: { inviteDesc: 'offer' },
        }),
      );

    const makeReceiveInvite = (paymentIssuer, handle) => () =>
      inviteAnOffer(
        harden({
          offerHook: receiveHook(paymentIssuer, handle),
          customProperties: { inviteDesc: 'get money' },
        }),
      );

    return harden({
      invite: zcf.makeInvitation(adminHook),
      publicAPI: {
        makeSendInvite,
        makeReceiveInvite,
        issuer: issuer,
      },
    });
  });
});
