// // eslint-disable-next-line import/no-extraneous-dependencies
// import { test } from 'tape-promise/tape';
// import bundleSource from '@agoric/bundle-source';
// import harden from '@agoric/harden';
// import produceIssuer from '@agoric/ertp';
// import { E } from '@agoric/eventual-send';
// import { makeZoe } from '@agoric/zoe';
// import buildManualTimer from '@agoric/zoe/tools/manualTimer'

// const contractRoot = `${__dirname}/../src/contracts/proxy.js`;

// test(`Time release contract`, async t => {
//   // Setup initial conditions
//   const zoe = makeZoe({ require });
//   const inviteIssuer = zoe.getInviteIssuer();

//   const timerService = buildManualTimer(console.log);
 
//   const contractReadyP = bundleSource(contractRoot).then(
//     ({ source, moduleFormat }) => {
//       const installationHandle = zoe.install(source, moduleFormat);

//       return zoe
//         .makeInstance(installationHandle, {}, { timerService })
//         .then(myInvite => {
//           return inviteIssuer
//             .getAmountOf(myInvite)
//             .then(({ extent: [{ instanceHandle: auditoriumHandle }] }) => {
//               const { publicAPI } = zoe.getInstanceRecord(auditoriumHandle);

//               return (
//                 zoe
//                   .offer(myInvite, harden({}))
//                   // cancel will be renamed complete: https://github.com/Agoric/agoric-sdk/issues/835
//                   // cancelObj exists because of a current limitation in @agoric/marshal : https://github.com/Agoric/agoric-sdk/issues/818
//                   .then(
//                     async ({
//                       // outcome: outcomeP,
//                       payout,
//                       // cancelObj: { cancel: complete },
//                       // offerHandle,
//                     }) => {
//                       // const amount = await E(publicAPI.issuer).getAmountOf((await payout).Wrapper); // necessary to wait for payout

//                       return {
//                         publicAPI,
//                         // operaPayout: payout,
//                         // complete,
//                       };
//                     },
//                   )
//               );
//             });
//         });
//     },
//   )

//   contractReadyP.then(({ publicAPI }) => {
//     const currencyIssuer = produceIssuer('BaytownBucks')
//     const { mint: baytownBucksMint, issuer } = currencyIssuer;
//     const baytownBucks = issuer.getAmountMath().make;

//     const amount = baytownBucks(1000);
//     const payment = baytownBucksMint.mintPayment(amount);

//     async function pushPullMoney(date, positive) {
//       const { issuer: wrapperIssuer, nonce } = await publicAPI.createToken(issuer);

//       let future = null;

//       const bob = {
//         receivePayment: async (futurePayment) => {
//           future = futurePayment;
//           // console.log(amount)
//           // const amount = await E(publicAPI.futureIssuer).getAmountOf(futurePayment); // FIXME: uncomment
//           // const timeRelease = amount.extent[0][0];

//           // const expectedAmount = await timeRelease.getAmount();
//           // t.equal(expectedAmount.extent, 1000, `correct expected payment amount`);
//           // t.equal(timeRelease.getIssuer().getBrand().getAllegedName(), 'BaytownBucks', 'payment was in BaytownBucks');

//           // const realPayment = await timeRelease.getPayment();
//           // if(!positive) {
//           //   t.equal(realPayment, null, `There is no payment yet.`);
//           // } else {
//           //   t.equal((await issuer.getAmountOf(realPayment)).extent, 1000, `correct payment amount`);
//           //   // Now the payment can be deposited.
//           // }

//           return {
//             publicAPI,
//           };
//         }
//       };

//       const sendInvite = inviteIssuer.claim(publicAPI.makeSendInvite(
//         harden(nonce), harden(bob), harden(date))());

//       const alice = () => {
//         return zoe
//           .offer(sendInvite, harden(aliceProposal), {})
//           .then(
//             async ({
//               // outcome: outcomeP,
//               payout,
//               // cancelObj: { cancel: complete },
//               // offerHandle,
//             }) => {
//               // const amount = await E(publicAPI.issuer).getAmountOf((await payout).Wrapper); // necessary to wait for payout
//               // console.log(amount);

//               return {
//                 publicAPI,
//               };
//             },
//           )
//           .then(() => {
//             return { publicAPI };
//           });
//       }

//       const give = {};
//       give['Wrapper' + nonce] = amount;
//       var paymentDesc = {};
//       paymentDesc['Wrapper' + nonce] = payment;
//       const aliceProposal = { give: give };

//       // console.log(payment.getAllegedBrand().getAllegedName());

//       // FIXME: This operator prints "payment not found for BaytownBucks"
//       return zoe
//         .offer(sendInvite, harden(aliceProposal), harden(paymentDesc))
//         .then(
//           async ({
//             // outcome: outcomeP,
//             payout,
//             // cancelObj: { cancel: complete },
//             // offerHandle,
//           }) => {
//             // const amount = await E(publicAPI.issuer).getAmountOf((await payout).Wrapper); // necessary to wait for payout
//             // console.log(amount);

//             return {
//               publicAPI,
//             };
//           },
//         )
//         .then(() => {
//           return { publicAPI };
//         });
//     }

//     return pushPullMoney(1, false)
//     //   .then(async (x) => {
//     //     await E(timerService).tick("Going to the future");
//     //     return pushPullMoney(1, true);
//     //   });
//   })
//   .catch(err => {
//     console.error('Error in last Time Release part', err);
//     t.fail('  error');
//   })
//   .then(() => t.end());
// });

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import bundleSource from '@agoric/bundle-source';
import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';
import produceIssuer from '@agoric/ertp';

import { makeZoe } from '@agoric/zoe';

const timeReleaseRoot = `${__dirname}/../src/contracts/proxy.js`;

test.only('zoe - time release', async t => {
  t.plan(1);
  try {
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(timeReleaseRoot);
    const installationHandle = await E(zoe).install(source, moduleFormat);

    const { mint, issuer, amountMath } = produceIssuer('aliceBucks');

    // TODO: make real timer obj
    const timer = {};

    // Alice creates a contract instance
    const addAssetsInvite = await E(zoe).makeInstance(
      installationHandle,
      { Token: issuer },
      { timer },
    );

    // Alice adds assets
    const tokens1000 = amountMath.make(1000);
    const bucksPayment = mint.mintPayment(tokens1000);
    const aliceProposal = harden({
      give: { Token: tokens1000 },
      // she will not be able to exit on her own. We could also have a
      // deadline that is after the expected timed release of the funds.
      exit: { waived: null },
    });
    const { outcome: bobInvite } = await E(zoe).offer(
      addAssetsInvite,
      aliceProposal,
      { Token: bucksPayment },
    );

    // Bob tries to get the funds. Right now he can get them
    // immediately because we didn't set up the timer
    const { payout: payoutP } = await E(zoe).offer(bobInvite);

    // Bob's payout promise resolves
    const bobPayout = await payoutP;
    const bobTokenPayout = await bobPayout.Token;

    const tokenPayoutAmount = await issuer.getAmountOf(bobTokenPayout);

    // Bob got 1000 tokens
    t.deepEquals(tokenPayoutAmount, tokens1000);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});