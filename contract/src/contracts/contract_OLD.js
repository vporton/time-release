// @ts-check
import harden from '@agoric/harden';
import { produceNotifier } from '@agoric/notifier';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport/zoeHelpers';
import produceIssuer from '@agoric/ertp';

import { makeTestTimeRelease } from './time-release';

/**
 * This contract does a few interesting things.
 *
 * @type {import('@agoric/zoe').MakeContract}
 */
export const makeContract = harden(zcf => {
    const { inviteAnOffer, rejectOffer } = makeZoeHelpers(zcf);
    const currencyIssuer = produceIssuer('BaytownBucks')
    const { mint: baytownBucksMint, issuer } = currencyIssuer;
    const baytownBucks = issuer.getAmountMath().make;

    const withdrawHook = offerHandle => {
        const payment = baytownBucksMint.mintPayment(baytownBucks(1000));
        let holder = makeTestTimeRelease(payment, Date.now());
        const purse = issuer.makeEmptyPurse();
        const tipAmountMath = zcf.getAmountMaths(harden(['Token'])).Token;
        const newUserAllocation = {
            Token: tipAmountMath.getAmountMath(),
        };
        purse.deposit(payment/*, baytownBucks(1000)*/);
        return `Payment made.`;
    };

    const makeInvite = () => {
        let invite = inviteAnOffer( // TODO: const
            harden({
                offerHook: withdrawHook,
                customProperties: { inviteDesc: 'timed withdrawal' },
            }));
        updater.updateState({fundsEscrowed: true});
        return invite;
    }

    const { notifier, updater } = produceNotifier();

    return zcf.addNewIssuer(issuer, 'Token').then(() => {
        const contractSelfInvite = zcf.makeInvitation(
            withdrawHook,
            {}
        );
        // return zcf
        //     .getZoeService()
        //     .offer(
        //         contractSelfInvite,
        //         harden({ give: { Token: baytownBucks(1000) } }), // FIXME: Don't repeat constants
        //         harden({ Token: ticketsPayment }),
        //     )
        return harden({
            invite: makeInvite(),
            publicAPI: {
                makeInvite,
                getNotifier: () => notifier, // TODO: Rename.
                currencyIssuer: currencyIssuer,
            },
        });
    });
});
