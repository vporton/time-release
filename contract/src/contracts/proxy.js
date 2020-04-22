/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';

import { makeTimeRelease } from './time-release';

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
/**
 * @type {import('@agoric/zoe').MakeContract}
 */
export const makeContract = harden(zcf => {
  // Create the internal token mint
  const { issuer: wrapperIssuer, mint: wrapperMint, amountMath: wrapperAmountMath } = produceIssuer('BaytownBucks');
  const { issuer, mint, amountMath } = produceIssuer(
    'Futures',
    'set',
  );
  const baytownBucks = wrapperAmountMath.make;
  const wrapperToken = amountMath.make;

  return zcf.addNewIssuer(issuer, 'Wrapper').then(() => {
    // the contract creates an offer {give: wrapper, want: nothing} with the tickets
    const offerHook = userOfferHandle => {
      // Do a payment right now:
      const lockedPayment1 = wrapperMint.mintPayment(baytownBucks(1000));
      let date = new Date();
      const lock1 = makeTimeRelease(lockedPayment1, date);

      // Allow a payment after 10 years:
      const lockedPayment2 = wrapperMint.mintPayment(baytownBucks(2000));
      let date2 = new Date(date);
      date2.setFullYear(date2.getFullYear() + 10); // I hope we won't stay 10 years paused
      const lock2 = makeTimeRelease(lockedPayment2, date2);

      const wrapperAmount = wrapperToken(harden([harden({timeLock1: lock1, timeLock2: lock2})]));
      const ticketsPayment = mint.mintPayment(wrapperAmount);

      let tempContractHandle;
      const contractSelfInvite = zcf.makeInvitation(
        offerHandle => (tempContractHandle = offerHandle),
      );

      zcf
        .getZoeService()
        .offer(
          contractSelfInvite,
          harden({ give: { Wrapper: wrapperAmount } }),
          harden({ Wrapper: ticketsPayment }),
        ).then(() => {
          // Don't forget to call this, otherwise the other side won't be able to get the money:
          lock1.setOffer(tempContractHandle);
          lock2.setOffer(tempContractHandle);

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
    return harden({
      invite: zcf.makeInvitation(offerHook),
      publicAPI: {
        currency: wrapperToken,
        issuer: issuer,
      },
    });
  });
});
