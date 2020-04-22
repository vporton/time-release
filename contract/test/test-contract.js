// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

import { makeZoe } from '@agoric/zoe';

const operaConcertTicketRoot = `${__dirname}/../src/contracts/operaConcertTicket.js`;

// __Test Scenario__

// The Opera de Bordeaux plays the contract creator and the auditorium
// It creates the contract for a show ("Steven Universe, the Opera", Web, March 25th 2020 at 8pm, 3 tickets)
// The Opera wants 22 moolas per ticket

// Alice buys ticket #1

// Then, the Joker tries malicious things:
// - they try to buy again ticket #1 (and will fail)
// - they try to buy to buy ticket #2 for 1 moola (and will fail)

// Then, Bob tries to buy ticket 1 and fails. He buys ticket #2 and #3

// The Opera is told about the show being sold out. It gets all the moolas from the sale

test(`Zoe opera ticket contract`, async t => {
  // Setup initial conditions
  const {
    mint: moolaMint,
    issuer: moolaIssuer,
    amountMath: { make: moola },
  } = produceIssuer('moola');

  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();

  // === Initial Opera de Bordeaux part ===
  const contractReadyP = bundleSource(operaConcertTicketRoot).then(
    ({ source, moduleFormat }) => {
      const expectedAmountPerTicket = moola(22);

      const installationHandle = zoe.install(source, moduleFormat);

      return zoe
        .makeInstance(installationHandle, harden({ Money: moolaIssuer }), {
          show: 'Steven Universe, the Opera',
          start: 'Web, March 25th 2020 at 8pm',
          count: 3,
          expectedAmountPerTicket,
        })
        .then(auditoriumInvite => {
          return inviteIssuer
            .getAmountOf(auditoriumInvite)
            .then(({ extent: [{ instanceHandle: auditoriumHandle }] }) => {
              const { publicAPI } = zoe.getInstanceRecord(auditoriumHandle);

              t.equal(
                typeof publicAPI.makeBuyerInvite,
                'function',
                'publicAPI.makeBuyerInvite should be a function',
              );
              t.equal(
                typeof publicAPI.getTicketIssuer,
                'function',
                'publicAPI.getTicketIssuer should be a function',
              );
              t.equal(
                typeof publicAPI.getAvailableTickets,
                'function',
                'publicAPI.getAvailableTickets should be a function',
              );

              // The auditorium makes an offer.
              return (
                // Note that the proposal here is empty
                // This is due to a current limitation in proposal expressivness: https://github.com/Agoric/agoric-sdk/issues/855
                // It's impossible to know in advance how many tickets will be sold, so it's not possible
                // to say `want: moola(3*22)`
                // in a future version of Zoe, it will be possible to express:
                // "i want n times moolas where n is the number of sold tickets"
                zoe
                  .offer(auditoriumInvite, harden({}))
                  // cancel will be renamed complete: https://github.com/Agoric/agoric-sdk/issues/835
                  // cancelObj exists because of a current limitation in @agoric/marshal : https://github.com/Agoric/agoric-sdk/issues/818
                  .then(
                    async ({
                      outcome: auditoriumOutcomeP,
                      payout,
                      cancelObj: { cancel: complete },
                      offerHandle,
                    }) => {
                      t.equal(
                        await auditoriumOutcomeP,
                        `Payment accepted.`,
                      );
                      t.equal(
                        typeof complete,
                        'function',
                        'complete should be a function',
                      );

                      const { currentAllocation } = await E(zoe).getOffer(
                        await offerHandle,
                      );

                      t.equal(
                        currentAllocation.Ticket.extent.length,
                        3,
                        `the auditorium offerHandle should be associated with the 3 tickets`,
                      );

                      return {
                        publicAPI,
                        operaPayout: payout,
                        complete,
                      };
                    },
                  )
              );
            });
        });
    },
  );

  const alicePartFinished = contractReadyP.then(({ publicAPI }) => {
    const ticketIssuer = publicAPI.getTicketIssuer();
    const ticketAmountMath = ticketIssuer.getAmountMath();

    // === Alice part ===
    // Alice starts with 100 moolas
    const alicePurse = moolaIssuer.makeEmptyPurse();
    alicePurse.deposit(moolaMint.mintPayment(moola(100)));

    // Alice makes an invite
    const aliceInvite = inviteIssuer.claim(publicAPI.makeBuyerInvite());
    return inviteIssuer
      .getAmountOf(aliceInvite)
      .then(({ extent: [{ instanceHandle: aliceHandle }] }) => {
        const { terms: termsOfAlice } = zoe.getInstanceRecord(aliceHandle);
        // Alice checks terms
        t.equal(termsOfAlice.show, 'Steven Universe, the Opera');
        t.equal(termsOfAlice.start, 'Web, March 25th 2020 at 8pm');
        t.equal(termsOfAlice.expectedAmountPerTicket.brand, moola(22).brand);
        t.equal(termsOfAlice.expectedAmountPerTicket.extent, moola(22).extent);

        const availableTickets = publicAPI.getAvailableTickets();
        // and sees the currently available tickets
        t.equal(
          availableTickets.length,
          3,
          'Alice should see 3 available tickets',
        );
        t.ok(
          availableTickets.find(ticket => ticket.number === 1),
          `availableTickets contains ticket number 1`,
        );
        t.ok(
          availableTickets.find(ticket => ticket.number === 2),
          `availableTickets contains ticket number 2`,
        );
        t.ok(
          availableTickets.find(ticket => ticket.number === 3),
          `availableTickets contains ticket number 3`,
        );

        // find the extent corresponding to ticket #1
        const ticket1Extent = availableTickets.find(
          ticket => ticket.number === 1,
        );
        // make the corresponding amount
        const ticket1Amount = ticketAmountMath.make(harden([ticket1Extent]));

        const aliceProposal = harden({
          give: { Money: termsOfAlice.expectedAmountPerTicket },
          want: { Ticket: ticket1Amount },
        });

        const alicePaymentForTicket = alicePurse.withdraw(
          termsOfAlice.expectedAmountPerTicket,
        );

        return zoe
          .offer(aliceInvite, aliceProposal, {
            Money: alicePaymentForTicket,
          })
          .then(({ payout: payoutP }) => {
            return payoutP.then(alicePayout => {
              return ticketIssuer
                .claim(alicePayout.Ticket)
                .then(aliceTicketPayment => {
                  return ticketIssuer
                    .getAmountOf(aliceTicketPayment)
                    .then(aliceBoughtTicketAmount => {
                      t.equal(
                        aliceBoughtTicketAmount.extent[0].show,
                        'Steven Universe, the Opera',
                        'Alice should have receieved the ticket for the correct show',
                      );
                      t.equal(
                        aliceBoughtTicketAmount.extent[0].number,
                        1,
                        'Alice should have received the ticket for the correct number',
                      );
                    });
                });
            });
          });
      });
  });

});