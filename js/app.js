Object.defineProperty(Vue.prototype, 'WebMidi', { value: WebMidi });
const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, StaveConnector } = Vex.Flow;


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
        midiCode: ['a/0', 'a#/0', 'b/0',
            'c/1', 'c#/1', 'd/1', 'd#/1', 'e/1', 'f/1', 'f#/1', 'g/1', 'g#/1', 'a/1', 'a#/1', 'b/1',
            'c/2', 'c#/2', 'd/2', 'd#/2', 'e/2', 'f/2', 'f#/2', 'g/2', 'g#/2', 'a/2', 'a#/2', 'b/2',
            'c/3', 'c#/3', 'd/3', 'd#/3', 'e/3', 'f/3', 'f#/3', 'g/3', 'g#/3', 'a/3', 'a#/3', 'b/3',
            'c/4', 'c#/4', 'd/4', 'd#/4', 'e/4', 'f/4', 'f#/4', 'g/4', 'g#/4', 'a/4', 'a#/4', 'b/4',
            'c/5', 'c#/5', 'd/5', 'd#/5', 'e/5', 'f/5', 'f#/5', 'g/5', 'g#/5', 'a/5', 'a#/5', 'b/5',
            'c/6', 'c#/6', 'd/6', 'd#/6', 'e/6', 'f/6', 'f#/6', 'g/6', 'g#/6', 'a/6', 'a#/6', 'b/6',
            'c/7', 'c#/7', 'd/7', 'd#/7', 'e/7', 'f/7', 'f#/7', 'g/7', 'g#/7', 'a/7', 'a#/7', 'b/7',
            'c/8'],
        lowNoteMidiArr: [],
        upNoteMidiArr: [],
        scoreContext: null,
        staveTreble: null,
        staveBass: null,
        upVoice: null,
        lowVoice: null,
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

        this.initScore()
        this.renderScore(['a/0', 'e/2', 'g/3', 'bb/3', 'c/4', 'd#/4', 'e/4', 'g/4', 'a/3'])

        // this.renderScore(['c/3'])
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

        initScore() {
            const div = document.getElementById('scorePanel');
            const renderer = new Renderer(div, Renderer.Backends.SVG);

            renderer.resize(180, 320);
            this.scoreContext = renderer.getContext();
            this.scoreContext.setFont('Arial', 10);

            this.staveTreble = new Stave(10, 60, 180);
            this.staveBass = new Stave(10, 140, 180);

            this.staveTreble.addClef('treble')
            this.staveBass.addClef('bass')

            const connector = new StaveConnector(this.staveTreble, this.staveBass);
            connector.setType(StaveConnector.type.SINGLE);
            connector.setContext(this.scoreContext);

            this.staveTreble.setContext(this.scoreContext).draw();
            this.staveBass.setContext(this.scoreContext).draw();
            connector.draw();
        },

        renderScore(noteArr) {
            if (this.upVoice != null) {
                this.upVoice.tickables[0].attrs.el.remove()
            }
            if (this.lowVoice != null) {
                this.lowVoice.tickables[0].attrs.el.remove()
            }

            const context = this.scoreContext
            const staveTreble = this.staveTreble
            const staveBass = this.staveBass

            const upNotes = []
            const lowNotes = []

            noteArr.forEach(function(key) {
                if (parseInt(key.split('/')[1]) >= 4) {
                    upNotes.push(key)
                } else {
                    lowNotes.push(key)
                }
            })

            console.log(upNotes)
            console.log(lowNotes)

            const voices = [];

            if (upNotes.length !== 0) {
                const upStaveNote = new StaveNote({
                    keys: upNotes,
                    duration: "w",
                    align_center: true,
                })

                for (let i = 0; i < upNotes.length; ++i) {
                    if (upNotes[i].split('/')[0].length > 1) {
                        upStaveNote.addModifier(new Accidental(upNotes[i].split('/')[0][1]), i)
                    }
                }

                const notesUp = [
                    upStaveNote,
                ];

                this.upVoice = new Voice({}).addTickables(notesUp)

                voices.push(this.upVoice)
            }

            if (lowNotes.length !== 0) {
                const lowStaveNote = new StaveNote({
                    keys: lowNotes,
                    duration: "w",
                    align_center: true,
                    clef: 'bass',
                })

                for (let i = 0; i < lowNotes.length; ++i) {
                    if (lowNotes[i].split('/')[0].length > 1) {
                        lowStaveNote.addModifier(new Accidental(lowNotes[i].split('/')[0][1]), i)
                    }
                }

                const notesLow = [
                    lowStaveNote,
                ];

                this.lowVoice = new Voice({}).addTickables(notesLow)

                voices.push(this.lowVoice)
            }

            new Formatter().joinVoices(voices).format(voices, 120);

            if (upNotes.length !== 0) {
                this.upVoice.draw(context, staveTreble);
            }
            if (lowNotes.length !== 0) {
                this.lowVoice.draw(context, staveBass);
            }

        },
    }
});
