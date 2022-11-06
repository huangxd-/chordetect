// DOM选择器
const $id = (id) => document.getElementById(id);
const $name = (name) => document.getElementsByName(name);
const $c = (c) => document.getElementsByClassName(c);
const $q = (query) => document.querySelectorAll(query);
const $qs = (query) => document.querySelector(query);

// 各种UI
let c2p = {name:"c2p"};

c2p.hash = (hash) => {
    if (hash == undefined) {
        let hash = $qs("#chordname input").value;
        return hash;
    }

    c2p.draw();
};

c2p.event = () => {
    app.chordChecks = [... $q("#inchord label[class='chordCheckbox ivu-checkbox-wrapper ivu-checkbox-default ivu-checkbox-border'] input[type=checkbox]")];
    const listener = $dom => $dom.addEventListener("change", () => {
        app.chordVar = $dom.parentNode.parentNode.innerText.split("/").shift().trim();
        app.chordOptions = app.chordChecks.map($dom => $dom.parentNode.parentNode.innerText.split("/").shift().trim());

        chordChange()

        location.hash = c2p.hash();
    });

    app.chordChecks.map(listener);
    $qs("#chordname input").addEventListener("keydown", (e) => {
        if (e.keyCode === 13) {
            location.hash = c2p.hash();
            c2p.draw();
        }
    });
};

function chordChange() {
    // 排他处理
    if (app._data[app.chordPropMap[app.chordVar]]) {
        [["+5","-5","dim"],
         ["+5","-5","omit5"],
         ["+5","(-13)"],
         ["-5","(+11)"],
         ["m","(+9)"],
         ["m", "omit3", "sus4", "sus2"],
         ["(11)", "sus4"],
         ["(13)", "6"],
         ["m", "dim"],
         ["6","M7","7"]].filter(excls => excls.indexOf(app.chordVar) != -1)
            .map(excls => excls.join(";")).join(";").split(";").sort()
            .map(form => app.chordOptions.indexOf(form)).filter(v => v != -1)
            .forEach(idx => app._data[app.chordPropList[idx]] = false);
        app._data[app.chordPropMap[app.chordVar]] = true;
    }

    // 命名
    let root = app.modelRoot;
    let onroot = app.modelOnRoot;
    app.chordInput = root + app.chordChecks.map(($dom, n) => {
        if (!app._data[app.chordPropList[n]]) return "";
        let key = app.chordOptions[n];
        return key;
    }).join("");

    if (app.slashChord && onroot !== root) {
        app.chordInput += " / " + onroot
    }

    $id("ignored").style.display = "none";
    app.drawPianoKeyFromChordInput()
}

function clearInput() {
    app.chordPropList.map($item => {app._data[$item] = false});
    app.slashChord = false;
    $id("ignored").style.display = "none";
    app.drawPianoKeyFromChordInput()
}

c2p.draw = () => {

    let $this = $qs("#chordname input");
    let struct = chordlibs.struct($this.value);
    if (!struct) {
        let val = $qs("#root input").value + $this.value;
        $this.value = (val);
        struct = chordlibs.struct(val);
    }

    const show_ignored = (ignored) => {
        if (!ignored) {
            app.drawPianoKeyFromChordInput()
            return $id("ignored").style.display = "none";
        }
        $id("ignored").style.display = "inline";
        $id("ignoredstr").innerText = ignored;
    };
    show_ignored(struct.ignored);

    app.chordPropList.map($item => {app._data[$item] = false});
    app.modelRoot = app.keyNames[struct.root]
    if (struct.onroot !== -1) {
        app.modelOnRoot = app.keyNames[struct.onroot]
        app.slashChord = true
    } else {
        app.slashChord = false
    }

    struct.tensions.concat([struct.triad, struct.tetrad]).map(name => {
        if (!name) return -1;
        let form = {"min":"m", "aug":"+5", "maj7":"M7"}[name] || name;
        let interval = chordlibs.interval2semitone(form);
        return (interval < 0) ? app.chordOptions.indexOf(form) :
            app.chordOptions.map(v => chordlibs.interval2semitone(v))
            .indexOf(interval);
    }).filter(v => v != -1)
        .forEach(idx => (app._data[app.chordPropList[idx]] = true));
};

window.onload = function() {
    c2p.event();
};
