class _TimeRelease {
    constructor(payment, lockedUntil = Date.now()) {
        let _payment = payment;
        let _lockedUntil = lockedUntil;
        this.lockedUntil = function() {
            return _lockedUntil;
        }
        this.getPayment = function() {
            return Date.now() >= _lockedUntil ? _payment : null;
        }
    }
}

_TimeRelease = harden(_TimeRelease);

export function makeTimeRelease(payment, lockedUntil = Date.now()) {
    return harden(new _TimeRelease(payment, lockedUntil));
}
