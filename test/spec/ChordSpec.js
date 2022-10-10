const testData = [
    ["C", "", "c", "e", "g"],
    ["C", "sus4", "c", "f", "g"]
]

describe("ChordTester", function () {
    for (var i = 0; i < testData.length; i++) {
        const index = i
        it(`${testData[index].slice(2)} should be chord ${testData[index][0]}${testData[index][1]}`, function () {
            expect(getC(testData[index].slice(2))).toEqual(`${testData[index][0]}${testData[index][1]}`);
        });
    }
});
