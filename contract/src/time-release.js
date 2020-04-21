export class BaseTimeRelease extends Purse {
    constructor(periods, periodLength, amount, initiated = Date.now()) {
        this.periods = periods;
        this.periodLength = periodLength;
        this.amount = amount;
        this.initiated = initiated;
        // FIXME: harden
    }
    getCurrentAmount() {
        const fullPeriodsPassed = Math.floor((currentTime() - this.initiated) / this.periodLength);
        if(fullPeriodsPassed < _transfer.lockedForPeriods) return 0;
        if(fullPeriodsPassed >= _transfer.vestedForPeriods) fullPeriodsPassed = _transfer.vestedForPeriods - 1;
        const perPeriod = _transfer.amount / _transfer.vestedForPeriods;
        return this.periodAmount * (fullPeriodsPassed + 1); // FIXME: math
    }
    // withdraw(amount) {        
    // }
    currentTime() { }
}

export class TimeRelease extends BaseTimeRelease {
    currentTime() {
        return Date.now();
    }
}

export class TestTimeRelease extends BaseTimeRelease {
    setCurrentTime(time) {
        this._currentTime = time;
    }
    currentTime() {
        return this._currentTime;
    }
}