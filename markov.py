import argparse
import itertools
import json
import math
import sys
import random


NGRAM_LENGTH = 3
MIN_WORD_LENGTH = 5


class MarkovChain(object):
    """
    A general MarkovChain.

    `corpus` can be any iterable of hashable ngrams.
    """
    def __init__(self, corpus):
        self.tokens = {}
        a, b = itertools.tee(corpus)
        b = itertools.cycle(b)
        self.add_token(next(b))
        for (t1, t2) in zip(a, b):
            self.add_token(t2, t1)

    def add_token(self, token, previous=None):
        if token in self.tokens:
            self.tokens[token][1] += 1
        else:
            self.tokens[token] = [MarkovNode(token), 1]
        if previous:
            self.tokens[previous][0].add_transition(self.tokens[token][0])


class PassphraseMarkovChain(MarkovChain):
    """
    A MarkovChain for passphrase generation.

    `get_passphrase` will generate passphrases that start and end with ngrams
    from the corpus word boundaries so that the 'words' feel like complete
    words from the corpus.

    `corpus` should be an iterable of ngram-tuples. e.g. `('a', 'n', 't')`.
    """
    def __init__(self, corpus):
        super().__init__(corpus)
        total = 0
        starting_token_count = {}
        for (token, (node, count)) in self.tokens.items():
            if token[0] == ' ':
                if not starting_token_count.get(token):
                    starting_token_count[token] = 0
                starting_token_count[token] += count
                total += count
        distribution = [c / total for c in starting_token_count.values()]
        self.alias_distribution = AliasDistribution(distribution)
        self.starting_tokens = list(starting_token_count.keys())

    def get_starting_node(self):
        return self.tokens[self.starting_tokens[self.alias_distribution.choice()]][0]

    def get_passphrase(self, min_entropy):
        node = self.get_starting_node()
        nodes = [node]
        e = self.alias_distribution.entropy
        while True:
            e += node.entropy
            node = node.get_random_transition()
            nodes.append(node)
            if e >= min_entropy and node.value[-1] == ' ':
                break
        tail = ''.join(nodes[-1].value[:-1])
        return ''.join(node.value[0] for node in nodes)[1:] + tail, e

    def to_json(self):
        return json.dumps(
            {
                'startingNgrams': [''.join(value) for value in self.starting_tokens],
                'startingDistribution': self.alias_distribution.json_data(),
                'nodes': {
                    ''.join(token): node.json_data()
                    for (token, (node, count)) in self.tokens.items()
                }
            }
        )


class MarkovNode(object):
    """
    A node in a MarkovChain.

    `value` must be a hashable token.
    """
    def __init__(self, value):
        self.value = value
        self.transition_counts = {}
        self._alias_distribution = None

    def add_transition(self, node):
        if not self.transition_counts.get(node.value):
            self.transition_counts[node.value] = [node, 0]
        self.transition_counts[node.value][1] += 1
        self._alias_distribution = None

    @property
    def alias_distribution(self):
        if not self._alias_distribution:
            total = sum(x[1] for x in self.transition_counts.values())
            pairs = self.transition_counts.values()
            self.transitions = [x[0] for x in pairs]
            distribution = [x[1] / total for x in pairs]
            self._alias_distribution = AliasDistribution(distribution)
        return self._alias_distribution

    @property
    def entropy(self):
        return self.alias_distribution.entropy

    def get_random_transition(self):
        return list(self.transition_counts.values())[self.alias_distribution.choice()][0]

    def json_data(self):
        return {
            'ngram': ''.join(self.value),
            'transitions': [''.join(value) for value in self.transition_counts],
            'aliasDistribution': self.alias_distribution.json_data(),
        }

    def __repr__(self):
        return "MarkovNode({})".format(self.value)


class AliasDistribution(object):
    """
    An alias table distribution.

    Used for selecting an index from a weighted distribution. `distribution`
    should be a list of probabilities which sum to 1. See
    https://en.wikipedia.org/wiki/Alias_method.

    If `d = AliasDistribution([0.2, 0.2, 0.6])`, `d.choice()` will return
    each of `0`, or `1` 20% of the time, and `2` 60% of the time.
    """
    def __init__(self, distribution):
        self.table_size = len(distribution)
        self.entropy = entropy(distribution)
        self.probability_table = [p * self.table_size for p in distribution]
        self.alias_table = list(range(self.table_size))
        overfull = []
        underfull = []
        for i, value in enumerate(self.probability_table):
            rounded = round(value, 10)
            if rounded < 1:
                underfull.append(i)
            elif rounded > 1:
                overfull.append(i)
        while underfull:
            i = underfull.pop()
            j = overfull.pop()
            self.alias_table[i] = j
            new_value = self.probability_table[j] + self.probability_table[i] - 1.0
            self.probability_table[j] = new_value
            rounded = round(new_value, 10)
            if rounded < 1:
                underfull.append(j)
            elif rounded > 1:
                overfull.append(j)

    def choice(self):
        i = random.randint(0, self.table_size - 1)
        y = random.random()
        if self.probability_table[i] < y:
            i = self.alias_table[i]
        return i

    def json_data(self):
        return {
            'probabilityTable': self.probability_table,
            'aliasTable': self.alias_table,
            'entropy': self.entropy,
        }


def entropy(probs):
    return -sum(p * math.log(p, 2) for p in probs)


def get_ngrams(infile):
    cleaned_lines = [clean_line(line) for line in infile]
    cleaned = ' '.join(line for line in cleaned_lines if line)

    its = list(itertools.tee(cleaned, NGRAM_LENGTH))
    for i in range(NGRAM_LENGTH):
        for j in range(i):
            next(its[i])

    return zip(*its)


def clean_line(line):
    words = [
        word for word in line.lower().strip().split(' ')
        if word.isalpha() and len(word) >= MIN_WORD_LENGTH
    ]
    return ' '.join(words)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Generate passphrases using markov chains")
    parser.add_argument('file', type=argparse.FileType('r'), nargs='?')
    args = parser.parse_args()
    corpus = get_ngrams(args.file or sys.stdin)
    chain = PassphraseMarkovChain(corpus)
    print(chain.get_passphrase(60))
