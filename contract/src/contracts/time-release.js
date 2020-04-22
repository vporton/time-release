import { E } from '@agoric/eventual-send';

class _TimeRelease {
    // FIXME: Needs `E()` for timerService.
    constructor(zcf, payment, lockedUntil = Date.now()) {
        let _offer = null;
        let _payment = payment;
        let _lockedUntil = lockedUntil;
        this.lockedUntil = function() {
            return _lockedUntil;
        }
        this.getPayment = function() {
            const zoe = zcf.getZoeService();
            return _offer && zoe.isOfferActive(_offer) && Date.now() >= _lockedUntil ? _payment : null;
        }
        // SECURITY: Don't forget to call this function,
        // otherwise getPayment() will always return null.
        this.setOffer = function(offer) {
            _offer = offer;
        }
    }
}

_TimeRelease = harden(_TimeRelease);

export function makeTimeRelease(zcf, payment, lockedUntil = Date.now()) {
    return harden(new _TimeRelease(zcf, payment, lockedUntil));
}
