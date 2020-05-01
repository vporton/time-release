import harden from '@agoric/harden';

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport';
import { E } from '@agoric/eventual-send';

// Alice escrows funds, and then Bob can get them as a payout, but
// only after a certain time.

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(zcf => {
  const { swap, assertKeywords } = makeZoeHelpers(zcf);
  assertKeywords(harden(['Token']));

  const { terms: { timerService }} = zcf.getInstanceRecord();

  const { inviteAnOffer, rejectOffer } = makeZoeHelpers(zcf);

  const makeClaimAssetsInvite = date => addAssetsOfferHandle => {
    const claimAssetsOfferHook = async claimAssetsOfferHandle => {
      console.log(await E(timerService).getCurrentTimestamp(), ">=", date);
      if(await E(timerService).getCurrentTimestamp() < date) {
        // We don't reject, saving it for the future.
        return; // rejectOffer(claimAssetsOfferHandle, `The time has not yet come.`);
      }

      return swap(addAssetsOfferHandle, claimAssetsOfferHandle);
    };

    return inviteAnOffer({
      offerHook: claimAssetsOfferHook,
      customProperties: harden({ inviteDesc: 'claimAssets' }),
    });
  };

  const adminInvite = () =>
    zcf.makeInvitation(
      () => {},
      harden({ inviteDesc: 'start' }),
    );

  const makeAddAssetsInvite = () => (date) => {
    return inviteAnOffer({
      offerHook: makeClaimAssetsInvite(date),
      customProperties: harden({ inviteDesc: 'addAssets' }),
    });
  }

  return harden({
    invite: adminInvite(),
    publicAPI: {
      makeAddAssetsInvite,
    }
  });
});