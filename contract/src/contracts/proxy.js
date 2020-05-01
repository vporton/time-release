// /* eslint-disable no-use-before-define */
// import harden from '@agoric/harden';
// import produceIssuer from '@agoric/ertp';
// import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport';

// import { makeTimeRelease } from './time-release';
// import { cleanProposal } from '@agoric/zoe/src/cleanProposal';


// // zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
// /**
//  * @type {import('@agoric/zoe').MakeContract}
//  */
// export const makeContract = harden(zcf => {
//   const { terms: { timerService } = {} } = zcf.getInstanceRecord();

//   let nonce = 0;

//   const { issuer: issuer0, mint: mint0, amountMath: amountMath0 } = produceIssuer(
//     'Future',
//     'set',
//   );
//   // const wrapperToken0 = amountMath0.make;

//   const createToken = (issuer0) => {
//     // Create the token mint
//     const { issuer: wrapperIssuer } = produceIssuer(
//       'Wrapper' + ++nonce,
//       'set',
//     );

//     return zcf.addNewIssuer(issuer0, 'Wrapper' + nonce)/*.then(afterDynamicallyAddingNewIssuer)*/
//       .then(() => {
//         return { issuer: wrapperIssuer, nonce };
//       });
//   };

//   let tempContractHandle;
//   const contractSelfInvite = zcf.makeInvitation(
//     offerHandle => (tempContractHandle = offerHandle),
//   );

//   const receiveHook = inviteToken => async userOfferHandle => {
//     const extent = inviteToken.extent;
//     if(await E(_timerService).getCurrentTimestamp() < extent.date) {
//       zcf.rejectOffer(userOfferHandle);
//       return;
//     }
//     zcf.reallocate(
//       [tempContractHandle, userOfferHandle],
//       [
//         zcf.getCurrentAllocation(userOfferHandle),
//         zcf.getCurrentAllocation(tempContractHandle),
//       ],
//     );
//     zcf.complete([tempContractHandle, userOfferHandle]); // FIXME: enough just one of them?
//   };

//   // the contract creates an offer {give: [nonce], want: nothing} with the time release wrapper
//   const sendHook = (nonce, receiver, date) => async userOfferHandle => {
//     //nonces.set(nonce, receiver);

//     const lockedAmount = zcf.getCurrentAllocation(userOfferHandle); // paymentIssuer.getAmountOf(lockedPayment);

//     // const wrapperAmountMath = wrapperIssuer.getAmountMath();
//     // const wrapperToken = wrapperAmountMath.make;

//     // const lock = makeTimeRelease(zcf, timerService, paymentIssuer, lockedPayment, date);
//     // payments.set(receiver, lock);

//     // const wrapperAmount = wrapperToken0(harden([nonce]));
//     // const wrapperPayment = mint0.mintPayment(wrapperAmount);
  
//     var give = {}; // TODO
//     give/*['Wrapper' + nonce]*/ = zcf.getCurrentAllocation(userOfferHandle, [ 'Wrapper' + nonce ]);
//     // var paymentDesc = {};
//     // paymentDesc['Wrapper' + nonce] = lockedPayment;
//     await zcf
//       .getZoeService()
//       .offer(
//         contractSelfInvite,
//         harden({ /*want: want*/ }),
//         harden({}),
//       ).then(async () => {
//         // Don't forget to call this, otherwise the other side won't be able to get the money:
//         //lock.setOffer(tempContractHandle); // FIXME: Remove

//         // const unique = {};
        
//         // a self-referential structure
//         let record = {
//           // offerHook: receiveHook(record),
//           customProperties: { inviteDesc: 'offer' },
//           // unique: unique,
//           extent: {
//             nonce: nonce,
//             amount: lockedAmount,
//             date: date,
//           },
//           expected: {
//             give: give,
//           },
//         };
//         record.offerHook = receiveHook(record);

//         const inviteToken =
//           inviteAnOffer(
//             harden(record),
//           );
//         console.log(inviteToken)

//         await receiver.receivePayment(inviteToken);
          
//       //   await zcf
//       //     .getZoeService()
//       //     .offer(
//       //       contractSelfInvite,
//       //       harden({ give: { Future: inviteToken } }), // TODO: Describe the payment here.
//       //       harden({ Future: wrapperPayment }),
//       //     ).then(async () => {
//       //       // Don't forget to call this, otherwise the other side won't be able to get the money:
//       //       //lock.setOffer(tempContractHandle);

//       //       //receiver.receivePayment(receiverWrapperPayment)
//       //       zcf.reallocate(
//       //         [tempContractHandle, userOfferHandle],
//       //         [
//       //           zcf.getCurrentAllocation(userOfferHandle),
//       //           zcf.getCurrentAllocation(tempContractHandle),
//       //         ],
//       //       );
//       //       zcf.complete([tempContractHandle, userOfferHandle]); // FIXME: enough just one of them?
//       //       return `Future sent.`;
//       // });

//         zcf.reallocate(
//           [tempContractHandle, userOfferHandle],
//           [
//             zcf.getCurrentAllocation(userOfferHandle),
//             zcf.getCurrentAllocation(tempContractHandle),
//           ],
//         );
//         zcf.complete([tempContractHandle, userOfferHandle]); // FIXME: enough just one of them?

//         var give = {};
//         give['Wrapper' + nonce] = lockedAmount;
//     });

//   };

//   const { inviteAnOffer } = makeZoeHelpers(zcf);   

//   const adminHook = userOfferHandle => {
//   }

//   const makeSendInvite = (nonce, receiver, date) => () =>
//     inviteAnOffer(
//       harden({
//         offerHook: sendHook(nonce, receiver, date),
//         customProperties: { inviteDesc: 'offer' },
//       }),
//     );

//   return harden({
//     invite: zcf.makeInvitation(adminHook),
//     publicAPI: {
//       createToken,
//       makeSendInvite,
//       futureIssuer: issuer0,
//     },
//   });
// });

////////////////////////////////////////////////////////////

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

  const makeClaimAssetsInvite = date => addAssetsOfferHandle => {
    const claimAssetsOfferHook = async claimAssetsOfferHandle => {
      console.log(await E(timerService).getCurrentTimestamp(), ">=", date);
      if(await E(timerService).getCurrentTimestamp() < date) {
        zcf.rejectOffer(claimAssetsOfferHandle);
        return;
      }

      return swap(addAssetsOfferHandle, claimAssetsOfferHandle);
    };

    return zcf.makeInvitation(
      claimAssetsOfferHook,
      harden({ inviteDesc: 'claimAssets' }),
    );
  };

  const { inviteAnOffer } = makeZoeHelpers(zcf);

  const adminInvite = () =>
    zcf.makeInvitation(
      () => {},
      harden({ inviteDesc: 'start' }),
    );

  const makeAddAssetsInvite = () => (date) => {
    console.log(date)
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