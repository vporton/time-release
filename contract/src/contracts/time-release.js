import { makeZoe } from '@agoric/zoe';
import { E } from '@agoric/eventual-send';

class _TimeRelease {
    constructor(payment, lockedUntil = Date.now()) {
        let _offer = null;
        let _payment = payment;
        let _lockedUntil = lockedUntil;
        this.lockedUntil = function() {
            return _lockedUntil;
        }
        this.getPayment = function() {
            const zoe = makeZoe({ require });
            return _offer && E(zoe).isOfferActive(_offer) && Date.now() >= _lockedUntil ? _payment : null;
        }
        // SECURITY: Don't forget to call this function,
        // otherwise the payment can be withdrawn even if offer is not accepted!
        this.setOffer = function(offer) {
            _offer = offer;
        }
    }
}

_TimeRelease = harden(_TimeRelease);

export function makeTimeRelease(payment, lockedUntil = Date.now()) {
    return harden(new _TimeRelease(payment, lockedUntil));
}
