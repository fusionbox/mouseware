/**
 * Function to generate passphrases from the precalculated markovChain.
 */
;(function(exports) {
  var MIN_ENTROPY = 60;

  function pickFromAliasDistribution(choices, distribution) {
    var i = random.random(choices.length);
    // See https://docs.oracle.com/javase/7/docs/api/java/util/Random.html#nextFloat()
    var y = random.random(1 << 24) / (1 << 24);
    if (distribution.probabilityTable[i] < y) {
      i = distribution.aliasTable[i];
    }
    return choices[i];
  }

  exports.genPassphrase = function() {
    var ngram = pickFromAliasDistribution(markovChain.startingNgrams, markovChain.startingDistribution);
    var ngrams = [ngram];
    var e = markovChain.startingDistribution.entropy;
    while (e < MIN_ENTROPY || ngram.slice(-1) != ' ') {
      var nodeData = markovChain.nodes[ngram];
      e += nodeData.aliasDistribution.entropy;
      ngram = pickFromAliasDistribution(nodeData.transitions, nodeData.aliasDistribution)
      ngrams.push(ngram);
    }
    return ngrams.map(function(s) { return s.charAt(1); }).join("");
  };
})(window);
