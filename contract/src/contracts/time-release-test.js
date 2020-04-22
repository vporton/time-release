/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';

import { makeTimeRelease } from './time-release';

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(zcf => {
  // Create the internal token mint
  const { issuer: wrapperIssuer, mint: wrapperMint, amountMath: wrapperAmountMath } = produceIssuer('BaytownBucks');
  const { issuer, mint, amountMath } = produceIssuer(
    'Futures',
    'set',
  );
  const baytownBucks = wrapperAmountMath.make;
  const wrapperToken = amountMath.make;

  return zcf.addNewIssuer(issuer, 'Token').then(() => {
    // the contract creates an offer {give: tickets, want: nothing} with the tickets
    const offerHook = userOfferHandle => {
      const lockedPayment = wrapperMint.mintPayment(baytownBucks(1000));
      let date = new Date();
      let date2 = new Date(date);
      date2.setFullYear(date2.getFullYear() + 10); // I hope we won't stay 10 years paused
      const lock = makeTimeRelease(lockedPayment, date2);

      const ticketsAmount = wrapperToken(harden([harden({timeLock: lock})]));
      const ticketsPayment = mint.mintPayment(ticketsAmount);
      let tempContractHandle;
      const contractSelfInvite = zcf.makeInvitation(
        offerHandle => (tempContractHandle = offerHandle),
      );
      zcf
        .getZoeService()
        .offer(
          contractSelfInvite,
          harden({ give: { Token: ticketsAmount } }),
          harden({ Token: ticketsPayment }),
        ).then(() => {
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
