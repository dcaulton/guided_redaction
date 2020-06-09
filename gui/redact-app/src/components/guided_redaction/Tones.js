function Kick(context) {
  this.context = context;
};

Kick.prototype.setup = function() {
  this.osc = this.context.createOscillator();
  this.gain = this.context.createGain();
  this.osc.connect(this.gain);
  this.gain.connect(this.context.destination)
};

Kick.prototype.trigger = function(time) {
  this.setup();                                                                                                         

  this.osc.frequency.setValueAtTime(150, time);
  this.gain.gain.setValueAtTime(1, time);

  this.osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
  this.gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

  this.osc.start(time);

  this.osc.stop(time + 0.5);
};

function Snare(context) {
  this.context = context;
};

Snare.prototype.noiseBuffer = function() {
  var bufferSize = this.context.sampleRate;
  var buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
  var output = buffer.getChannelData(0);

  for (var i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  return buffer;
};
Snare.prototype.setup = function() {
  this.noise = this.context.createBufferSource();
  this.noise.buffer = this.noiseBuffer();
  var noiseFilter = this.context.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000; 
  this.noise.connect(noiseFilter);
  // 
  // 
this.noiseEnvelope = this.context.createGain();
noiseFilter.connect(this.noiseEnvelope);

this.noiseEnvelope.connect(this.context.destination);
// …  
this.osc = this.context.createOscillator();
this.osc.type = 'triangle';

this.oscEnvelope = this.context.createGain();
this.osc.connect(this.oscEnvelope);
this.oscEnvelope.connect(this.context.destination);
};

Snare.prototype.trigger = function(time) {
  this.setup();

  this.noiseEnvelope.gain.setValueAtTime(1, time);
  this.noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  this.noise.start(time)

  this.osc.frequency.setValueAtTime(100, time);
  this.oscEnvelope.gain.setValueAtTime(0.7, time);
  this.oscEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  this.osc.start(time)

  this.osc.stop(time + 0.2);
  this.noise.stop(time + 0.2);
};




function Blip(context) {
  this.context = context;
};

Blip.prototype.setup = function() {
  this.oscillator = this.context.createOscillator()
  this.final_gain = this.context.createGain()
  this.final_gain.connect(this.context.destination)
  this.oscillator.connect(this.context.destination)
};

Blip.prototype.trigger = function(time) {
  this.setup();
  this.oscillator.start(0)
  this.final_gain.gain.setValueAtTime(.1, 0)
  this.oscillator.frequency.setValueAtTime(800, 0);
  this.oscillator.frequency.exponentialRampToValueAtTime(1, time + .1)
}


function LFO(context) {
  this.context = context;
};

LFO.prototype.setup = function() {
  this.ChildLFO = this.context.createOscillator()
  this.VCA = this.context.createGain()
  this.oscillator = this.context.createOscillator()
  this.oscillator2 = this.context.createOscillator()
  this.final_gain = this.context.createGain()
  this.oscillator.frequency.value = 293.66  // D4 - Root
  this.oscillator2.frequency.value = 220.00 // A3 - 5th one octave down
  this.ChildLFO.frequency.value = 4
  this.ChildLFO.connect(this.VCA.gain)
  this.oscillator.connect(this.VCA)
  this.oscillator2.connect(this.VCA)
  this.VCA.connect(this.final_gain)
  this.final_gain.connect(this.context.destination)
};

LFO.prototype.trigger = function(time) {
  this.setup();
  this.ChildLFO.start(0)
  this.final_gain.gain.exponentialRampToValueAtTime(1, .25)
  this.oscillator.start(0)
  this.oscillator2.start(0)
  this.final_gain.gain.exponentialRampToValueAtTime(0.00001, time + 1)
}

function CompositeTone(context) {
  this.context = context;
  this.Kick = Kick;
  this.Snare = Snare
  this.LFO = LFO
};

CompositeTone.prototype.makeKick= function(context) {
  return new Kick(context)
}
CompositeTone.prototype.makeSnare= function(context) {
  return new Snare(context)
}
CompositeTone.prototype.makeLFO= function(context) {
  return new LFO(context)
}
CompositeTone.prototype.makeBlip= function(context) {
  return new Blip(context)
}

export default CompositeTone
