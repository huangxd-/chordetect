
const octavepitchclass = (tonename) => {
    let ret = ("C D EF G A B").indexOf(tonename.charAt(0));
    ret += tonename.slice(-1) * 12;
    if (tonename.charAt(1) == "#") ret++;
    if (tonename.charAt(1) == "b") ret--;
    return ret;
};

const gt_open = "E0,A0,D1,G1,B1,E2".split(",").map(v => octavepitchclass(v));

// Repetition composition musical note position
const gt_mapper = (notes) => notes.map(note => gt_open.map(open => (120 + note - open) % 12));


// Possessive pressure model
const make_pattern = function(postable) {
    let n = 0;
    let sol = [];

    const check_all_in_3 = (ret) => {
        let pos = ret.filter(v => 0 < v).sort((a, b) => (a - b));
        return (pos.length == 0) || (pos.slice(-1)[0] - pos[0] <= 3);
    };

    const select_rest = (index, ret) => {
        postable.forEach(val => {
            ret.push(val[index]);

            if (check_all_in_3(ret)) {
                if (index == 5) {
                    sol.push([].concat(ret));
                    n++;
                } else {
                    select_rest(index + 1, ret);
                }
            }
            ret.pop();
        });
    };

    postable[0].slice(0, 3).forEach((pos, index) => {
        let ret = [];

        // root position
        if (index == 2 && 4 < pos) return;
        for (let i = 0; i < index; i++) ret.push(-1);
        ret.push(pos);

        select_rest(index + 1, ret);
    });

    return sol;
}

// Evaluate string pressing efficiency
const eval_pattern = function(pattern, tonesize, ceja) {
    const check_all_in_3 = function(ret) {
        let pos = ret.filter(v => 0 < v).sort((a, b)=>(a - b));
        return pos.length == 0 || (pos.slice(-1)[0] - pos[0] <= 3);
    };

    const fingers = function(ret) {
        let x = {};
        let min = ret.reduce((min, val) => {
            if (val == -1) return min;
            if (min == -1 || val < min) return val;
            return min;
        }, -1);

        x.n = (min != 0) ? 1 : 0;
        x.n += ret.filter(val => (val != min && val != -1)).length;
        x.min = min;
        if (min == 0) {
            let disp = ret.filter(v => v != min && v != -1).sort((a,b) => a - b);
            x.disp = ret.filter(v => (disp[0] + 2 < v) || (0 < v && v + 2 < disp.slice(-1)[0])).length;
        } else {
            x.disp = ret.filter(v => min + 2 < v).length;
        }
        
        return x;
    };

    const num_of_tone = function(ret) {
        return ret.map((v, index) => v < 0 ? v : (gt_open[index] + v) % 12)
            .filter((v, i, self) => v != -1 && self.indexOf(v) === i)
            .length;
    };

    const same_tone = function(ret) {
        return ret.map((v, index) => v < 0 ? v : gt_open[index] + v)
            .filter(v => v != -1)
            .some((v, i, self) => self.indexOf(v) !== i);
    };

    const remote_tone = function(ret) {
        return ret.map((v, index) => v < 0 ? v : gt_open[index] + v)
            .slice(3).filter(v => v != -1)
            .sort((a, b) => (a - b))
            .some((v, i, self) => ((i + 1) < self.length) && (self[i + 1] - v > 8));
    };

    const unsorted = function(ret) {
        return ret.map((v, index) => v < 0 ? v : gt_open[index] + v)
            .filter(v => v != -1)
            .some((v, i, self) => ((i + 1) < self.length) && (self[i + 1] < v));
    };

    let c = "";
    let fn = fingers(pattern);
    c += "f".repeat(fn.disp);
    //if (fn.n == 4 && fn.min == 0) c += "z";
    if (fn.n >= 5) c += "F";
    if (num_of_tone(pattern) < tonesize) c += "L";
    if (same_tone(pattern)) c += "S";
    if (remote_tone(pattern)) c += "R";
    if (unsorted(pattern)) c += "C";

    return c;
}

const guitarform = function(tones) {
    tones = tones.map(v => v % 12).filter((tone, i, self) => self.indexOf(tone) == i);

    let frets = gt_mapper(tones);
    let result = make_pattern(frets)
        .map(v => {
            let eval = eval_pattern(v, tones.length);
            let comp = eval.split("").reduce((sum, c) => sum + [3,1,16,8,4,2,1]["zfFLSRC".indexOf(c)], 0);
            return {form: v, comp: comp, eval: eval};
        })
        .filter(v => v.comp < 8)
        .sort((a,b) => {
            let dcomp = a.comp - b.comp;
            if (dcomp) return dcomp;

            const root = (arr) => {
                let idx = arr.findIndex(v => v != -1);
                return gt_open[idx] + arr[idx];
            };
            let droot = root(a.form) - root(b.form);
            if (droot) return droot;

            const avg = (arr) => {
                let sub = arr.filter(v => 0 < v);
                return arr.reduce((sum, v) => sum + v, 0) / sub.length;
            };
            return avg(a.form) - avg(b.form);

        });
    return result;
};

/*
<guitarform: algorithm>
(1)get all the fingering positions of the constituent notes(gt_mapper)
 triad: ACE
 A=[5, 0, 7,2,10,5](=6-string 5-fret, 5-string open, 4-string 7-fret...)
 C=[8, 3,10,5, 1,9]
 E=[0, 7, 2,9, 5,0]

(2)determine the route(make_pattern)
->The condition is 4 strings 4 frets or less
[5,_,_,_,_,_](=6 strings 5 ​​frets)
[x,0,_,_,_,_](=5th string open)

(3)Wash all patterns so that the rest is within ±3 frames(select_rest)

(4)Evaluate complexity, add points below and sort in ascending order(eval_pattern)
・f: There is a string that is 3 frets away
・L: there is a missing sound
・F: use 5 fingers
・S: There are strings that sound the same
・C: not in descending order
・R: there is a distant pitch
・T: Low tension: (not implemented)

(5)For L = 0, try adding x somewhere and re-evaluate (not implemented)

 */
