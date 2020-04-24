import { E } from '@agoric/eventual-send';

class _TimeRelease {
    constructor(zcf, timerService, issuer, payment, lockedUntil) {
        const _issuer = issuer;
        let _payment = payment;
        let _lockedUntil = lockedUntil;
        const _timerService = timerService;
        this.lockedUntil = function() {
            return _lockedUntil;
        }
        this.getPayment = async function() {
            // if(!_offer) return;
            // const zoe = zcf.getZoeService();
            return /*zoe.isOfferActive(_offer) &&*/ await E(_timerService).getCurrentTimestamp() >= _lockedUntil ? _payment : null;
        }
        // FIXME: query issuer
        this.getAmount = async function() {
            return await _issuer.getAmountOf(_payment);
        }
    }
}

_TimeRelease = harden(_TimeRelease);

export function makeTimeRelease(zcf, timerService, issuer, payment, lockedUntil) {
    return harden(new _TimeRelease(zcf, timerService, issuer, payment, lockedUntil));
}
