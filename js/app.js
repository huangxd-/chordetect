Object.defineProperty(Vue.prototype, 'WebMidi', { value: WebMidi });
const { Factory } = Vex.Flow;


var app = new Vue({
    el: '#app',
    props: {
    },
    data:  {
        nbKeys: 88,
        offsetKeys: 21,
        transpose: 0,
        colors: false,
        errorMessage: null,
        selectedMidiInputId: null,
        midiInput: null,
        keys: [],
        holdPedal: false,
        pageWidth: window.innerWidth,
        keyWidth: null,
        blackKeyWidth: null,
        vf: null,
        score: null,
        system: null,
        lowNotes: null,
        upNotes: null,
        midiCode: ['A0', 'A#0', 'B0',
            'C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1',
            'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
            'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
            'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
            'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
            'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6', 'G6', 'G#6', 'A6', 'A#6', 'B6',
            'C7', 'C#7', 'D7', 'D#7', 'E7', 'F7', 'F#7', 'G7', 'G#7', 'A7', 'A#7', 'B7',
            'C8'],
        lowNoteMidiArr: [],
        upNoteMidiArr: [],
    },
    created: function () {

        this.initKeyboard();

        WebMidi.enable((errorMessage) => {

            if (errorMessage) {
                this.errorMessage = '' + errorMessage;
                console.log(errorMessage);
                return;
            }

            if(WebMidi.inputs.length) {
                this.selectedMidiInputId = WebMidi.inputs[0].id;
            }
        });

        // this.renderChord('', '')
        // this.renderChord('C2 E2 G3 Bb3', 'C4 D#4 E4 G4 Bb4');
    },
    watch: {
        selectedMidiInputId(newMidiInputId) {
            if(this.midiInput) {
                this.midiInput.removeListener();
            }
            this.midiInput = WebMidi.getInputById(newMidiInputId);
            if(this.midiInput) {
                this.midiInput.addListener('noteon', 'all', (event) => {
                    var note = event.note.number - this.offsetKeys + this.transpose;
                    if(0 <= note && note < this.keys.length) {
                        this.keys[note].velocity = event.velocity;
                        this.keys[note].pushed = true;

                        // for (let i = 0; i < 89; ++i) {
                        //     if (this.keys[i] && this.keys[i].pushed === true) {
                        //         if (i < 39) {
                        //             this.lowNoteMidiArr.push(this.midiCode[i])
                        //         } else {
                        //             this.upNoteMidiArr.push(this.midiCode[i])
                        //         }
                        //     }
                        // }
                        // this.renderChord(this.lowNoteMidiArr, this.upNoteMidiArr)
                    }
                });
                this.midiInput.addListener('noteoff', 'all', (event) => {
                    var note = event.note.number - this.offsetKeys + this.transpose;
                    if(0 <= note && note < this.keys.length) {
                        if(!this.holdPedal) {
                            this.keys[note].velocity = 0;
                        }
                        this.keys[note].pushed = false;
                    }
                });
                this.midiInput.addListener('controlchange', 'all', (event) => {
                    // Hold pedal
                    if(event.controller.number === 64) {
                        if(event.value > 0) {
                            this.holdPedal = true;
                        } else {
                            this.holdPedal = false;
                            for(var i =0; i<this.keys.length; ++i) {
                                if(!this.keys[i].pushed) {
                                    this.keys[i].velocity = 0;
                                }
                            }
                        }
                    }

                });
            }
        }
    },
    computed: {
        liWidth: function() {
            this.keyWidth = `${(this.pageWidth - 50) / ((this.nbKeys + 1) / 12/*keys/octaves*/ * 7/*white keys/octave*/)}`
            return `${this.keyWidth}px`;
        },
        blackLiWidth: function() {
            this.blackKeyWidth = `${(this.keyWidth) * (20/ 36)}`
            return `${this.blackKeyWidth}px`;
        },
        blackLiLeft: function() {
            return `${(this.keyWidth) * (-12/ 36)}px`;
        },
    },
    methods: {
        initKeyboard() {

            var keys = [];
            for(var i = 0; i<this.nbKeys; ++i) {
                keys.push({
                    velocity: 0,
                    pushed: false
                });
            }

            this.keys = keys;
        },

        isBlackKey(key) {
            key = (this.offsetKeys + key) % 12;
            return (key < 5) == (key % 2);
        },

        velocityCss(velocity, index) {
            if(velocity <= 0) {
                return {};
            }

            var alpha = velocity * 0.4 + 0.6;
            var hue = this.colors ? ((index*7)%12) / 12 * 360 : 120;
            return {
                background: `hsla(${hue},100%,50%,${alpha})`
            };
        },

        renderChord(lowNoteArr, upNoteArr) {
            const scorePanel = document.getElementById("scorePanel")
            while (scorePanel.hasChildNodes()) {
                scorePanel.removeChild(scorePanel.lastChild);
            }

            this.vf = new Factory({
                renderer: { elementId: 'scorePanel', width: 500, height: 500 },
            });

            this.score = this.vf.EasyScore();
            this.system = this.vf.System();

            // TODO： 需要处理没有note的情况
            this.lowNotes = this.score.notes(`(${lowNoteArr})/1`, {clef:'bass'})
            this.upNotes = this.score.notes(`(${upNoteArr})/1`)

            this.system
                .addStave({
                    voices: [
                        this.score.voice(this.upNotes),
                    ],
                })
                .addClef('treble')

            this.system
                .addStave({
                    voices: [
                        this.score.voice(this.lowNotes),
                    ],
                })
                .addClef('bass')

            this.system.addConnector()

            this.vf.draw();
        },
    }
});
