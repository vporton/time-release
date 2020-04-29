// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import bundleSource from '@agoric/bundle-source';
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { makeZoe } from '@agoric/zoe';
import buildManualTimer from '@agoric/zoe/tools/manualTimer'

const contractRoot = `${__dirname}/../src/contracts/proxy.js`;

test(`Time release contract`, async t => {
  // Setup initial conditions
  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();

  const timerService = buildManualTimer(console.log);
 
  const contractReadyP = bundleSource(contractRoot).then(
    ({ source, moduleFormat }) => {
      const installationHandle = zoe.install(source, moduleFormat);

      return zoe
        .makeInstance(installationHandle, {}, { timerService })
        .then(myInvite => {
          return inviteIssuer
            .getAmountOf(myInvite)
            .then(({ extent: [{ instanceHandle: auditoriumHandle }] }) => {
              const { publicAPI } = zoe.getInstanceRecord(auditoriumHandle);

              return (
                zoe
                  .offer(myInvite, harden({}))
                  // cancel will be renamed complete: https://github.com/Agoric/agoric-sdk/issues/835
                  // cancelObj exists because of a current limitation in @agoric/marshal : https://github.com/Agoric/agoric-sdk/issues/818
                  .then(
                    async ({
                      // outcome: outcomeP,
                      payout,
                      // cancelObj: { cancel: complete },
                      // offerHandle,
                    }) => {
                      // const amount = await E(publicAPI.issuer).getAmountOf((await payout).Wrapper); // necessary to wait for payout

                      return {
                        publicAPI,
                        // operaPayout: payout,
                        // complete,
                      };
                    },
                  )
              );
            });
        });
    },
  )

  contractReadyP.then(({ publicAPI }) => {
    const currencyIssuer = produceIssuer('BaytownBucks')
    const { mint: baytownBucksMint, issuer } = currencyIssuer;
    const baytownBucks = issuer.getAmountMath().make;

    const payment = baytownBucksMint.mintPayment(baytownBucks(1000));

    async function pushPullMoney(date, positive) {
      const bob = positive => { return {
        receivePayment: async (wrapperPayment) => {
          const amount = await E(publicAPI.issuer).getAmountOf(wrapperPayment);
          const timeRelease = amount.extent[0][0];

          const expectedAmount = await timeRelease.getAmount();
          t.equal(expectedAmount.extent, 1000, `correct expected payment amount`);
          t.equal(timeRelease.getIssuer().getBrand().getAllegedName(), 'BaytownBucks', 'payment was in BaytownBucks');

          const realPayment = await timeRelease.getPayment();
          if(!positive) {
            t.equal(realPayment, null, `There is no payment yet.`);
          } else {
            t.equal((await issuer.getAmountOf(realPayment)).extent, 1000, `correct payment amount`);
            // Now the payment can be deposited.
          }

          return {
            publicAPI,
          };
        }
      }}

      const sendInvite = inviteIssuer.claim(publicAPI.makeSendInvite(
        bob(positive), harden(issuer), harden(payment), harden(date))());
      const aliceProposal = {};
      return zoe
        .offer(sendInvite, harden(aliceProposal), {})
        .then(
          async ({
            // outcome: outcomeP,
            payout,
            // cancelObj: { cancel: complete },
            // offerHandle,
          }) => {
            const amount = await E(publicAPI.issuer).getAmountOf((await payout).Wrapper); // necessary to wait for payout

            return {
              publicAPI,
            };
          },
        )
        .then(() => {
          return { publicAPI };
        });
    }

    return pushPullMoney(1, false)
      .then(async (x) => {
        await E(timerService).tick("Going to the future");
        return pushPullMoney(1, true);
      });
  })
  .catch(err => {
    console.error('Error in last Time Release part', err);
    t.fail('  error');
  })
  .then(() => t.end());
});