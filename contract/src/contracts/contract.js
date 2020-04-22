/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { makeZoeHelpers } from '/home/porton/Projects/bounties/agoric-sdk/packages/zoe/src/contractSupport'; // FIXME

/*
  Roles in the arrangement:
  - Contract creator: describes the contract with:
    - number of seats, show, date/time of start
    - expected (ERTP) amount per ticket (we assume all tickets cost the same)
  - Smart Contract:
    - mints the tickets
    - provides the seats
  - Auditorium (unique contract seat, usually taken by the contract creator): the person hosting
  the Opera show, selling the tickets and getting the payment back
  - Ticket buyers (contract seat created on demand):
    - can see the available opera show seats
    - can consult the terms
    - can redeem the zoe invite with the proper payment to get the ticket back

  ERTP and Zoe are considered to be the most highly trusted pieces of code by everyone
  They are more trusted than the code of this contract
  As a consequence, they are going to be leveraged as much as possible by this contract
  to increase its trustworthiness and by the contract users

*/

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(zcf => {
  // Create the internal ticket mint
  const currencyIssuer = produceIssuer('BaytownBucks')
  const { mint: baytownBucksMint, issuer } = currencyIssuer;
  const baytownBucks = issuer.getAmountMath().make;

  // const {
  //   // terms: { show, start, count, expectedAmountPerTicket },
  //   issuerKeywordRecord: { Money: moneyIssuer },
  // } = zcf.getInstanceRecord();

  // const moneyAmountMath = zcf.getAmountMaths(harden(['Token'])).Token;
  // const { amountMath: moneyAmountMath } = zcf.getIssuerRecord(moneyIssuer);

  let auditoriumOfferHandle;

  return zcf.addNewIssuer(issuer, 'Ticket').then(() => {
    // create Zoe helpers after zcf.addNewIssuer because of https://github.com/Agoric/agoric-sdk/issues/802
    const { rejectOffer } = makeZoeHelpers(zcf);

    // Mint tickets inside the contract
    // In a more realistic contract, the Auditorium would certainly mint the tickets themselves
    // but because of a current technical limitation when running the Agoric stack on a blockchain,
    // minting has to happen inside a Zoe contract https://github.com/Agoric/agoric-sdk/issues/821

    // Mint the tickets ahead-of-time (instead of on-demand)
    // This way, they can be passed to Zoe + ERTP who will be doing the bookkeeping
    // of which tickets have been sold and which tickets are still for sale
    const ticketsAmount = baytownBucks(1000);
    const ticketsPayment = baytownBucksMint.mintPayment(ticketsAmount);

    // the contract creates an offer {give: tickets, want: nothing} with the tickets
    const offerHook = userOfferHandle => {
      const ticketsAmount = baytownBucks(1000);
      const ticketsPayment = baytownBucksMint.mintPayment(ticketsAmount);
      let tempContractHandle;
      const contractSelfInvite = zcf.makeInvitation(
        offerHandle => (tempContractHandle = offerHandle),
      );
      zcf
        .getZoeService()
        .offer(
          contractSelfInvite,
          harden({ give: { Ticket: ticketsAmount } }),
          harden({ Ticket: ticketsPayment }),
        ).then(() => {
          // the contract transfers tickets to the auditorium leveraging Zoe offer safety
          // console.log(zcf.getCurrentAllocation(userOfferHandle),
          //             zcf.getCurrentAllocation(tempContractHandle))
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
        invite2: zcf.makeInvitation(offerHook),
        //makeBuyerInvite: () => zcf.makeInvitation(buyTicketOfferHook),
        currency: baytownBucks, // FIXME: security
        issuer: issuer,
      },
    });
  });
});
