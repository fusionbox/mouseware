/**
 * Function to generate passphrases from the precalculated markovChain.
 */
;(function(exports) {
  var MIN_ENTROPY = 60;

  function randomFloat() {
    // See https://docs.oracle.com/javase/7/docs/api/java/util/Random.html#nextFloat()
    //
    // Javascript numbers are actually doubles, so in principle something like
    // nextDouble would be more correct, but that algorithm requires 64 bit
    // integers. While we could replicate that, 24 bits of randomness is plenty
    // for our purposes.

    return random.random(1 << 24) / (1 << 24);
  }

  function pickFromAliasDistribution(distribution) {
    var i = random.random(distribution.probabilityTable.length);
    var y  = randomFloat();
    if (distribution.probabilityTable[i] < y) {
      i = distribution.aliasTable[i];
    }
    return i;
  }

  exports.genMarkovPassphrase = function(markovChain) {
    var ngram = markovChain.startingNgrams[
      pickFromAliasDistribution(markovChain.startingDistribution)
    ];
    var ngrams = [ngram];
    var entropy = markovChain.startingDistribution.entropy;
    while (entropy < MIN_ENTROPY || ngram.slice(-1) !== ' ') {
      var nodeData = markovChain.nodes[ngram];
      ngram = nodeData.transitions[pickFromAliasDistribution(nodeData.aliasDistribution)];
      ngrams.push(ngram);
      entropy += nodeData.aliasDistribution.entropy;
    }
    return {
      password: ngrams.map(function(s) { return s.charAt(1); }).join(""),
      entropy: entropy,
    };
  };
})(window);
