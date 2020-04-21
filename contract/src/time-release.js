class _BaseTimeRelease extends Payment {
    constructor(payment, lockedUntil = Date.now()) {
        this.#payment = payment;
        this.#lockedUntil = lockedUntil;
    }
    lockedUntil() {
        return this.#lockedUntil;
    }
    getPayment() {
        return this.currentTime() >= this.lockedUntil ? this.#payment : null;
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