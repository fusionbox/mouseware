#!/usr/bin/env python

import sys
import glob
from os.path import splitext, basename
import random
random = random.SystemRandom()

words = {}

src = "txt/*"

for file in glob.glob(src):
    with open(file, 'r') as f:
        place = splitext(basename(file))[0]
        # using list(set( words )) unique-ifies the words
        words[place] = list(set([i.strip() for i in f]))

if '--more' in sys.argv:
    construct = ['article', 'adjective', 'noun', 'verb', 'article', 'adjective', 'noun']
else:
    construct = ['adjective', 'noun', 'verb', 'adjective', 'noun']

sentence = []
for place in construct:
    sentence.append(random.choice(words[place]))

# todo: --number
if '--number' in sys.argv:
    sys.stderr.write('--number not done yet...\n')
    # 'a': '4',
    # 'e': '3',
    # 'i': '1',
    # 'o': '0',
    # 'q': '9',
    # 's': '5',
    # 't': '7',
    # 'z': '2'

# todo: --symbol
if '--symbol' in sys.argv:
    sys.stderr.write('--symbol not done yet...\n')
    # 'a': '@',
    # 'b': '|3',
    # 'c': '(',
    # 'h': '|-|',
    # 'i': '!',
    # 'k': '|<',
    # 'l': '|',
    # 't': '+',
    # 'v': '\\/',
    # 's': '$',
    # 'x': '%'

if '--dirty' in sys.argv:
    dirty = None
    while dirty not in ['dirty_adjective', 'dirty_noun', 'dirty_verb']:
        dirty_index = random.randrange(len(construct))
        dirty = 'dirty_' + construct[dirty_index]
    dirty = random.choice(words[dirty])
    sentence[dirty_index] = dirty

sys.stdout.write(' '.join(sentence) + "\n")
