class _BaseTimeRelease extends Payment {
    constructor(payment, lockedUntil = Date.now()) {
        let _payment = payment;
        let _lockedUntil = lockedUntil;
        this.lockedUntil = function() {
            return this._lockedUntil;
        }
        this.getPayment = function() {
            return this.currentTime() >= this.lockedUntil ? this._payment : null;
        }    
    }
    currentTime() { }
}

class _TimeRelease extends BaseTimeRelease {
    currentTime() {
        return Date.now();
    }
}

class _TestTimeRelease extends BaseTimeRelease {
    setCurrentTime(time) {
        this._currentTime = time;
    }
    currentTime() {
        return this._currentTime;
    }
}

export function makeTimeRelease(payment, lockedUntil = Date.now()) {
    return harden(new _TimeRelease(payment, lockedUntil));
}

export function makeTestTimeRelease(payment, lockedUntil = Date.now()) {
    return harden(new _TestTimeRelease(payment, lockedUntil));
}