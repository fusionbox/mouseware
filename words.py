#!python

import json
import glob
from os.path import splitext, basename

words = {}

src = "txt/*"
dest = "js/wordlist.js"

for file in glob.glob(src):
    with open(file, 'r') as f:
        place = splitext( basename(file) )[0]
        words[place] = [i.strip() for i in f]

with open(dest, 'w') as f:
    f.write("var words = ")
    json.dump(words, f)
    f.write(";")
