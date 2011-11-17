/**
 * Class for secure random number generation.
 * call random.addEntropy(anything) to add some randomness. mousemove is a good source.
 * call random.random(max) or random.choice(array) to get some.
 */
(function(exports) {
  exports.randomGen = function() {
    var buffer = ''
      , local_storage = typeof window.localStorage != 'undefined' ? localStorage : {}
      , TOTAL_EVENTS = 500
      , events_left = TOTAL_EVENTS;

    function seedOracle(buffer) {
      return Crypto.SHA256(buffer + 'seed');
    }

    function outputOracle(buffer) {
      return Crypto.SHA256(buffer + 'output');
    }

    var random_2 = function(bits) {
      var output = getRandomBuffer();
      if ( output.length*4 < bits )
        throw new Error('not enough bits in buffer');
      var hex = output.slice(0, Math.ceil(bits/4));
      return parseInt(hex, 16);
    };

    if ( local_storage.random_seed ) {
      /* we've got a seed from last time, add time to it just in case...*/
      buffer = seedOracle(localStorage.random_seed + (new Date()).valueOf());
      events_left = TOTAL_EVENTS = 0;
    }

    function updateLocalStorage() {
      if ( events_left <= 0 ) {
        local_storage.random_seed = outputOracle(buffer);
        buffer = seedOracle(buffer);
      }
    }

    function updateLocalStorageTimeout() {
      updateLocalStorage()
      setTimeout(updateLocalStorageTimeout, 5000);
    };
    setTimeout(updateLocalStorageTimeout, 5000);

    this.addEntropy = function(entropy) {
      events_left--;
      buffer = seedOracle(buffer + entropy);
    }

    var getRandomBuffer = this.getRandomBuffer = function() {
      var output = outputOracle(buffer);
      buffer = seedOracle(buffer);
      updateLocalStorage();
      return output;
    };


    this.random = function(max) {
      if ( max <= 1 )
        throw new Error('random() expects a max greater than 1');
      var bits = Math.ceil(Math.log(max)/Math.log(2))
        , n;

      do {
        n = random_2(bits);
      } while ( n >= max );
      return n;
    };

    this.choice = function(ary) {
      if ( ary.length == 0 )  return void(0);
      if ( ary.length == 1 )  return ary[0];
      var index = this.random(ary.length);
      return ary[index];
    };

    this.ready = function() {
      return events_left <= 0;
    }
  };
  exports.random = new exports.randomGen();
})(window);
