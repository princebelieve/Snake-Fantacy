/** Seedable shared random source for reproducible game rules and content. */
export class RandomGenerator {
    constructor(seed = null) {
        this.seed = (seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
        this.state = this.seed;
    }

    next() {
        this.state = (this.state + 0x6D2B79F5) >>> 0;
        let value = this.state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    }

    integer(minimum, maximum) { return Math.floor(this.next() * (maximum - minimum + 1)) + minimum; }
    pick(items) { return items.length ? items[this.integer(0, items.length - 1)] : undefined; }
    shuffle(items) {
        const result = [...items];
        for (let index = result.length - 1; index > 0; index--) {
            const other = this.integer(0, index);
            [result[index], result[other]] = [result[other], result[index]];
        }
        return result;
    }
}
