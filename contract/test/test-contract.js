// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import { E } from '@agoric/eventual-send';
import harden from '@agoric/harden';

import { makeZoe } from '@agoric/zoe';
import produceIssuer from '@agoric/ertp';
import { makeGetInstanceHandle } from '@agoric/zoe/src/clientSupport';

const contractPath = `${__dirname}/../src/contract`;

test('contract with valid offers', async t => {
  // t.plan(10);
  try {
    // Outside of tests, we should use the long-lived Zoe on the
    // testnet. In this test, we must create a new Zoe.
    const zoe = makeZoe({ require });

    // Get the Zoe invite issuer from Zoe.
    const inviteIssuer = await E(zoe).getInviteIssuer();

    // Make our helper functions.
    const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(contractPath);

    // Install the contract on Zoe, getting an installationHandle (an
    // opaque identifier). We can use this installationHandle to look
    // up the code we installed. Outside of tests, we can also send the
    // installationHandle to someone else, and they can use it to
    // create a new contract instance using the same code.
    const installationHandle = await E(zoe).install(source, moduleFormat);

    // Let's check the code. Outside of this test, we would probably
    // want to check more extensively,
    const code = await E(zoe).getInstallation(installationHandle);
    t.ok(
      code.includes(`This contract does a few interesting things.`),
      `the code installed passes a quick check of what we intended to install`,
    );

    // Make some mints/issuers just for our test.
    const {
      issuer: bucksIssuer,
      mint: bucksMint,
      amountMath: bucksAmountMath,
    } = produceIssuer('bucks');

    // Create the contract instance, using our new issuer.
    const adminInvite = await E(zoe).makeInstance(installationHandle, {});

    // Check that we received an invite as the result of making the
    // contract instance.
    t.ok(
      await E(inviteIssuer).isLive(adminInvite),
      `an valid invite (an ERTP payment) was created`,
    );

    // Use the helper function to get an instanceHandle from the invite.
    const instanceHandle = await getInstanceHandle(adminInvite);

    // Let's use the adminInvite to make an offer. This will allow us
    // to remove our tips at the end
    const {
      payout: adminPayoutP,
      outcome: adminOutcomeP,
      cancelObj: { cancel: cancelAdmin },
    } = await E(zoe).offer(adminInvite);

    await E(zoe).offer(adminInvite);

    // Let's test some of the publicAPI methods. The publicAPI is
    // accessible to anyone who has access to Zoe and the
    // instanceHandle. The publicAPI methods are up to the contract,
    // and Zoe doesn't require contracts to have any particular
    // publicAPI methods.
    const instanceRecord = await E(zoe).getInstance(instanceHandle);
    const { publicAPI } = instanceRecord;

    const notifier = publicAPI.getNotifier();
    const { value, updateHandle } = notifier.getUpdateSince();
    const nextUpdateP = notifier.getUpdateSince(updateHandle);

    // Let's use the contract like a client and get some encouragement!
    const withdrawalInvite = await E(publicAPI).makeInvite();

    const { outcome: withdrawalP } = await E(zoe).offer(withdrawalInvite);

    // Getting encouragement resolves the 'nextUpdateP' promise
    nextUpdateP.then(async result => {
      // t.equals(result.value.count, 1, 'count increments by 1');

      // Let's get our Tips
      Promise.resolve(E.G(adminPayoutP).Tip).then(tip => {
        bucksIssuer.getAmountOf(tip).then(tipAmount => {
          console.log("ZZZ", tipAmount.amountMath());
          t.deepEquals(tipAmount, 1000, `payout is 1000 bucks, all the tips`);
        });
      });
    });
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});
