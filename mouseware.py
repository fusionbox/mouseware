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

sentence = []
construct = ['adjective', 'noun', 'verb', 'adjective', 'noun']
for place in construct:
    sentence.append(random.choice(words[place]))

sys.stdout.write(' '.join(sentence) + "\n")
