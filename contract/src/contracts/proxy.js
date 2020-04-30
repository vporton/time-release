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

  let payments = new Map(); // from receiver to payment
  let nonces = new Map(); // from nonce to receiver // TODO: Don't use a separate map.

  let nonce = 0;

  // const { /*issuer0, mint0, amountMath0*/ } = produceIssuer(
  //   'Wrapper',
  //   'set',
  // );
  // const wrapperToken0 = amountMath0.make;

  const createToken = (issuer0) => {
    // Create the token mint
    const { issuer: wrapperIssuer } = produceIssuer(
      'Wrapper' + nonce,
      'set',
    );

    return zcf.addNewIssuer(issuer0, 'Wrapper' + nonce)/*.then(afterDynamicallyAddingNewIssuer)*/
      .then(() => {
        return { issuer: wrapperIssuer, nonce };
      });
  };

  // the contract creates an offer {give: [nonce], want: nothing} with the time release wrapper
  const sendHook = (nonce, wrapperIssuer, receiver, paymentIssuer, lockedPayment, date) => async userOfferHandle => {
    nonces.set(++nonce, receiver);

    const wrapperAmountMath = wrapperIssuer.getAmountMath();
    const wrapperToken = wrapperAmountMath.make;

    const lock = makeTimeRelease(zcf, timerService, paymentIssuer, lockedPayment, date);
    payments.set(receiver, lock);

    // await receiver.receivePayment(wrapperPayment); // wait until it is received
    const wrapperAmount = wrapperToken(harden([nonce]));
    const wrapperPayment = mint.mintPayment(wrapperAmount);
  
    await zcf
      .getZoeService()
      .offer(
        contractSelfInvite,
        harden({ want: { Wrapper: lockedAmount } }),
        harden({ Wrapper: lockedPayment }),
      ).then(async () => {
        // Don't forget to call this, otherwise the other side won't be able to get the money:
        //lock.setOffer(tempContractHandle); // FIXME: Remove
  
        receiver.receivePayment(receiverWrapperPayment)
        zcf.reallocate(
          [tempContractHandle, userOfferHandle],
          [
            zcf.getCurrentAllocation(userOfferHandle),
            zcf.getCurrentAllocation(tempContractHandle),
          ],
        );
        zcf.complete([tempContractHandle, userOfferHandle]); // FIXME: enough just one of them?

        return zcf
          .getZoeService()
          .offer(
            contractSelfInvite,
            harden({ give: { Wrapper: wrapperAmount } }), // TODO: Describe the payment here.
            harden({ Wrapper: wrapperPayment }),
          ).then(async () => {
            // Don't forget to call this, otherwise the other side won't be able to get the money:
            //lock.setOffer(tempContractHandle);

            //receiver.receivePayment(receiverWrapperPayment)
            zcf.reallocate(
              [tempContractHandle, userOfferHandle],
              [
                zcf.getCurrentAllocation(userOfferHandle),
                zcf.getCurrentAllocation(tempContractHandle),
              ],
            );
            zcf.complete([tempContractHandle, userOfferHandle]); // FIXME: enough just one of them?
            return `Pledge accepted.`;
      });
    });

  };

  const { inviteAnOffer } = makeZoeHelpers(zcf);   

  const adminHook = userOfferHandle => {
  }

  const makeSendInvite = (nonce, wrapperIssuer, receiver, paymentIssuer, lockedPayment, date) => () =>
    inviteAnOffer(
      harden({
        offerHook: sendHook(nonce, wrapperIssuer, receiver, paymentIssuer, lockedPayment, date),
        customProperties: { inviteDesc: 'offer' },
      }),
    );

  return harden({
    invite: zcf.makeInvitation(adminHook),
    publicAPI: {
      createToken,
      makeSendInvite,
    },
  });
});
