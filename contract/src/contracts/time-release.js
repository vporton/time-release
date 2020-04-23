import { E } from '@agoric/eventual-send';

class _TimeRelease {
    // FIXME: Needs `E()` for timerService.
    constructor(zcf, timerService, handle, payment, lockedUntil = Date.now()) {
        let _offer = null;
        let _payment = payment;
        let _lockedUntil = lockedUntil;
        this.lockedUntil = function() {
            return _lockedUntil;
        }
        this.getPayment = function() {
            if(!_offer) return;
            const zoe = zcf.getZoeService();
            return zoe.isOfferActive(_offer) && timerService.getCurrentTimestamp() >= _lockedUntil ? _payment : null;
        }
        // SECURITY: Don't forget to call this function,
        // otherwise getPayment() will always return null.
        this.setOffer = function(offer) {
            _offer = offer;
        }
    }
}

_TimeRelease = harden(_TimeRelease);

export function makeTimeRelease(zcf, timerService, payment, lockedUntil = Date.now()) {
    return harden(new _TimeRelease(zcf, payment, lockedUntil));
}
