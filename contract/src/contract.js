// @ts-check
import harden from '@agoric/harden';
import { produceNotifier } from '@agoric/notifier';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport/zoeHelpers';

import { makeTestTimeRelease } from './time-release';

/**
 * This contract does a few interesting things.
 *
 * @type {import('@agoric/zoe').MakeContract}
 */
export const makeContract = harden(zcf => {
    const { inviteAnOffer, rejectOffer } = makeZoeHelpers(zcf);
    const { mint: baytownBucksMint, issuer } = produceIssuer('BaytownBucks');
    const baytownBucks = issuer.getAmountMath().make;
    const payment = baytownBucksMint.mintPayment(baytownBucks(1000));

    const withdrawHook = offerHandle => {
        const payment = baytownBucksMint.mintPayment(baytownBucks);
        let holder = makeTestTimeRelease(payment, Date.now());
        const purse = issuer.makeEmptyPurse();
        purse.deposit(payment, baytownBucks);
        return `Payment made.`;
    };

    const makeInvite = () =>
        inviteAnOffer(
            harden({
                offerHook: withdrawHook,
                customProperties: { inviteDesc: 'encouragement' },
            }),
    );

    return harden({
        invite: inviteAnOffer(
            harden({
                offerHook: withdrawHook,
                customProperties: { inviteDesc: 'admin' },
            }),
        ),
        publicAPI: {
            makeInvite,
        },
    });
});
