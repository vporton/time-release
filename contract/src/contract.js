/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
//import { makeZoeHelpers, defaultAcceptanceMsg } from '../contractSupport';

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
  - Token buyers (contract seat created on demand):
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
  const { issuer, mint, amountMath: ticketAmountMath } = produceIssuer(
    'BaytownBucks',
    'set',
  );

  console.log("AAA", zcf.getInstanceRecord().issuerKeywordRecord)
  const {
    issuerKeywordRecord: { Token: moneyIssuer },
  } = zcf.getInstanceRecord();

  const { amountMath: moneyAmountMath } = zcf.getIssuerRecord(moneyIssuer);

  let auditoriumOfferHandle;

  return zcf.addNewIssuer(issuer, 'Token').then(() => {
    // Mint tickets inside the contract
    // In a more realistic contract, the Auditorium would certainly mint the tickets themselves
    // but because of a current technical limitation when running the Agoric stack on a blockchain,
    // minting has to happen inside a Zoe contract https://github.com/Agoric/agoric-sdk/issues/821

    // Mint the tickets ahead-of-time (instead of on-demand)
    // This way, they can be passed to Zoe + ERTP who will be doing the bookkeeping
    // of which tickets have been sold and which tickets are still for sale
    const baytownBucks = issuer.getAmountMath().make;
    const ticketsAmount = baytownBucks(1000);
    const ticketsPayment = mint.mintPayment(ticketsAmount);

    const internalTicketSupplyOfferHook = offerHandle =>
      (internalTicketSupplyHandle = offerHandle);

    const contractSelfInvite = zcf.makeInvitation(
      internalTicketSupplyOfferHook,
    );
    // the contract creates an offer {give: tickets, want: nothing} with the tickets
    return zcf
      .getZoeService()
      .offer(
        contractSelfInvite,
        harden({ give: { Token: ticketsAmount } }),
        harden({ Token: ticketsPayment }),
      )
      .then(() => {
        const withdrawalHook = offerHandle => {
          auditoriumOfferHandle = offerHandle;
          // the contract transfers tickets to the auditorium leveraging Zoe offer safety
          zcf.reallocate(
            [auditoriumOfferHandle],
            [
              zcf.getCurrentAllocation(auditoriumOfferHandle),
              zcf.getCurrentAllocation(internalTicketSupplyHandle),
            ],
          );
          zcf.complete([internalTicketSupplyHandle]);
          // the auditoriumOfferHandle is now associated with the
          // tickets and the contract offer is gone from the contract
          return `Payment accepted.`;
        };

        // const buyTicketOfferHook = buyerOfferHandle => {
        //   const buyerOffer = zcf.getOffer(buyerOfferHandle);

        //   const currentAuditoriumAllocation = zcf.getCurrentAllocation(
        //     auditoriumOfferHandle,
        //   );
        //   const currentBuyerAllocation = zcf.getCurrentAllocation(
        //     buyerOfferHandle,
        //   );

        //   const wantedTicketsCount =
        //     buyerOffer.proposal.want.Token.extent.length;
        //   const wantedMoney =
        //     expectedAmountPerTicket.extent * wantedTicketsCount;

        //   try {
        //     if (
        //       !moneyAmountMath.isGTE(
        //         currentBuyerAllocation.Money,
        //         moneyAmountMath.make(wantedMoney),
        //       )
        //     ) {
        //       throw new Error(
        //         'The offer associated with this seat does not contain enough moolas',
        //       );
        //     }

        //     const wantedAuditoriumAllocation = {
        //       Money: moneyAmountMath.add(
        //         currentAuditoriumAllocation.Money,
        //         currentBuyerAllocation.Money,
        //       ),
        //       Token: ticketAmountMath.subtract(
        //         currentAuditoriumAllocation.Token,
        //         buyerOffer.proposal.want.Token,
        //       ),
        //     };

        //     const wantedBuyerAllocation = {
        //       Money: moneyAmountMath.getEmpty(),
        //       Token: ticketAmountMath.add(
        //         currentBuyerAllocation.Token,
        //         buyerOffer.proposal.want.Token,
        //       ),
        //     };

        //     zcf.reallocate(
        //       [auditoriumOfferHandle, buyerOfferHandle],
        //       [wantedAuditoriumAllocation, wantedBuyerAllocation],
        //     );
        //     zcf.complete([buyerOfferHandle]);
        //   } catch (err) {
        //     // amounts don't match or reallocate certainly failed
        //     rejectOffer(buyerOfferHandle);
        //   }
        // };

        const { mint: baytownBucksMint, issuer } = currencyIssuer;
        const { notifier, updater } = produceNotifier();

        return harden({
          invite: zcf.makeInvitation(withdrawalHook),
          publicAPI: {
            makeInvite: () => zcf.makeInvitation(withdrawalHook),
            getNotifier: () => notifier, // TODO: Rename.
            currencyIssuer: currencyIssuer,
          },
        });
      });
  });
});