// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import bundleSource from '@agoric/bundle-source';
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { makeZoe } from '@agoric/zoe';
import buildManualTimer from '@agoric/zoe/tools/manualTimer'

const contractRoot = `${__dirname}/../src/contracts/proxy.js`;

test.only('zoe - time release', async t => {
  t.plan(1);
  try {
    // Setup initial conditions
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();

    const timerService = buildManualTimer(console.log);
    
    const { mint, issuer, amountMath } = produceIssuer('aliceBucks');

    const { source, moduleFormat } = await bundleSource(contractRoot);
    const installationHandle = await E(zoe).install(source, moduleFormat);

    // awkward code
    let publicAPI;
    // Alice creates a contract instance
    await zoe
      .makeInstance(installationHandle, { Token: issuer }, { timerService })
      .then(myInvite => {
        return inviteIssuer
          .getAmountOf(myInvite)
          .then(({ extent: [{ instanceHandle }] }) => {
            const { publicAPI: papi } = zoe.getInstanceRecord(instanceHandle);
            publicAPI = papi;
          })
        });    

    async function pushPullMoney(date, positive) {
      const addAssetsInvite = inviteIssuer.claim(publicAPI.makeAddAssetsInvite()(harden(date)));

      // Alice adds assets
      const tokens1000 = amountMath.make(1000);
      const bucksPayment = mint.mintPayment(tokens1000);
      const aliceProposal = harden({
        give: { Token: tokens1000 },
        // she will not be able to exit on her own. We could also have a
        // deadline that is after the expected timed release of the funds.
        exit: { waived: null },
      });
      const { outcome: bobInvitePromise } = await E(zoe).offer(
        addAssetsInvite,
        aliceProposal,
        { Token: bucksPayment },
      );
      const bobInvite = await bobInvitePromise; // FIXME: Correct?
      //console.log('bobInvite', await bobInvite)

      await E(timerService).tick("Going to the future");

      // Bob tries to get the funds.
      const { payout: payoutP } = await E(zoe).offer(bobInvite);

      // Bob's payout promise resolves
      const bobPayout = await payoutP;
      const bobTokenPayout = await bobPayout.Token;

      const tokenPayoutAmount = await issuer.getAmountOf(bobTokenPayout);

      t.equal(tokenPayoutAmount.extent, 1000, `correct payment amount`);
    }

    return pushPullMoney(1, false)
      // .then(async (bobInvite) => {
      // });
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});