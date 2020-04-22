/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { makeZoeHelpers } from '/home/porton/Projects/bounties/agoric-sdk/packages/zoe/src/contractSupport'; // FIXME

import { makeTestTimeRelease } from './time-release';

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(zcf => {
  // Create the internal token mint
  const { issuer: issuer1, mint: mint1, amountMath: amountMath1 } = produceIssuer('BaytownBucks');
  const { issuer, mint, amountMath } = produceIssuer(
    'Futures',
    'set',
  );
  const baytownBucks = amountMath1.make;
  const wrapperToken = amountMath.make;

//   const {
//     terms: { timeLock },
//   } = zcf.getInstanceRecord();

  return zcf.addNewIssuer(issuer, 'Ticket').then(() => {
    // Mint the tickets ahead-of-time (instead of on-demand)
    // This way, they can be passed to Zoe + ERTP who will be doing the bookkeeping
    // of which tickets have been sold and which tickets are still for sale
    // const ticketsPayment = baytownBucksMint.mintPayment(ticketsAmount);

    // the contract creates an offer {give: tickets, want: nothing} with the tickets
    const offerHook = userOfferHandle => {
      const lockedPayment = mint1.mintPayment(baytownBucks(1000));
      const lock = makeTestTimeRelease(lockedPayment);
      const ticketsAmount = wrapperToken(harden([harden({timeLock: lock})]));
      const ticketsPayment = mint1.mintPayment(ticketsAmount);
      let tempContractHandle;
      const contractSelfInvite = zcf.makeInvitation(
        offerHandle => (tempContractHandle = offerHandle),
      );
      zcf
        .getZoeService()
        .offer(
          contractSelfInvite,
          harden({ give: { Ticket: lock } }),
          harden({ Ticket: ticketsPayment }),
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
        invite2: zcf.makeInvitation(offerHook), // FIXME
        currency: baytownBucks, // FIXME: security
        issuer: issuer,
      },
    });
  });
});
